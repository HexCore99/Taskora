use rusqlite::{params, OptionalExtension};
use serde::Serialize;

use crate::db::get_connection;

#[derive(Serialize)]
pub struct JustTaskBoard {
    id: i64,
    name: String,
    position: i32,
}

#[tauri::command]
pub fn get_just_task_boards(app: tauri::AppHandle) -> Result<Vec<JustTaskBoard>, String> {
    let conn = get_connection(&app)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, position
             FROM just_task_boards
             WHERE in_trash = 0
             ORDER BY position ASC, name ASC",
        )
        .map_err(|err| err.to_string())?;

    let boards = stmt
        .query_map([], |row| {
            Ok(JustTaskBoard {
                id: row.get(0)?,
                name: row.get(1)?,
                position: row.get(2)?,
            })
        })
        .map_err(|err| err.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())?;

    Ok(boards)
}

#[tauri::command]
pub fn create_just_task_board(
    app: tauri::AppHandle,
    name: String,
) -> Result<JustTaskBoard, String> {
    let name = name.trim();

    if name.is_empty() {
        return Err("JustTask name cannot be empty".to_string());
    }

    let conn = get_connection(&app)?;
    let already_exists: bool = conn
        .query_row(
            "SELECT EXISTS(
                SELECT 1
                FROM just_task_boards
                WHERE name = ?
            )",
            params![name],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if already_exists {
        return Err(format!("A JustTask named \"{name}\" already exists"));
    }

    let position: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1
             FROM just_task_boards
             WHERE in_trash = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    let id = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "INSERT INTO just_task_boards (id, name, position)
         VALUES (?, ?, ?)",
        params![id, name, position],
    )
    .map_err(|err| err.to_string())?;

    Ok(JustTaskBoard {
        id,
        name: name.to_string(),
        position,
    })
}

#[tauri::command]
pub fn delete_just_task_board(app: tauri::AppHandle, just_task_id: i64) -> Result<(), String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let board_exists: bool = tx
        .query_row(
            "SELECT EXISTS(
                SELECT 1
                FROM just_task_boards
                WHERE id = ?
                  AND in_trash = 0
            )",
            params![just_task_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if !board_exists {
        return Err("JustTask board does not exist".to_string());
    }

    let task_count: i64 = tx
        .query_row(
            "SELECT COUNT(*)
             FROM tasks
             WHERE just_task_id = ?",
            params![just_task_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if task_count == 0 {
        tx.execute(
            "DELETE FROM just_task_boards WHERE id = ?",
            params![just_task_id],
        )
        .map_err(|err| err.to_string())?;
    } else {
        tx.execute(
            "UPDATE just_task_boards
             SET in_trash = 1
             WHERE id = ?",
            params![just_task_id],
        )
        .map_err(|err| err.to_string())?;

        tx.execute(
            "UPDATE tasks
             SET in_trash = 1
             WHERE just_task_id = ?
               AND in_trash = 0",
            params![just_task_id],
        )
        .map_err(|err| err.to_string())?;
    }

    tx.commit().map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn move_board_to_just_tasks(
    app: tauri::AppHandle,
    project_id: i64,
    board_id: i64,
) -> Result<JustTaskBoard, String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let board: Option<String> = tx
        .query_row(
            "SELECT boards.name
             FROM boards
             JOIN projects ON projects.id = boards.project_id
             WHERE boards.id = ?
               AND boards.project_id = ?
               AND boards.in_trash = 0
               AND projects.in_trash = 0",
            params![board_id, project_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| err.to_string())?;
    let name = board.ok_or_else(|| "Board does not exist".to_string())?;

    let name_exists: bool = tx
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM just_task_boards WHERE name = ?)",
            params![name],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    if name_exists {
        return Err(format!("A JustTask named \"{name}\" already exists"));
    }

    let position: i32 = tx
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1
             FROM just_task_boards
             WHERE in_trash = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    let id = chrono::Utc::now().timestamp_millis();

    tx.execute(
        "INSERT INTO just_task_boards (id, name, position) VALUES (?, ?, ?)",
        params![id, name, position],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        "UPDATE tasks
         SET board_id = NULL,
             just_task = 1,
             just_task_id = ?
         WHERE board_id = ?",
        params![id, board_id],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        "DELETE FROM boards WHERE id = ? AND project_id = ?",
        params![board_id, project_id],
    )
    .map_err(|err| err.to_string())?;

    tx.commit().map_err(|err| err.to_string())?;

    Ok(JustTaskBoard { id, name, position })
}
