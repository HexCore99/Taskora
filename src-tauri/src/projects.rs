use rusqlite::{params, OptionalExtension};
use serde::Serialize;

use crate::db::get_connection;

#[derive(Serialize)]
pub struct Board {
    id: i64,
    project_id: i64,
    name: String,
    position: i32,
}

#[derive(Serialize)]
pub struct Project {
    id: i64,
    name: String,
    position: i32,
    boards: Vec<Board>,
}

#[tauri::command]
pub fn get_project_tree(app: tauri::AppHandle) -> Result<Vec<Project>, String> {
    let conn = get_connection(&app).map_err(|err| err.to_string())?;

    /*
     * Read the projects first. Wrapping this in a block ensures the
     * statement is released before we start reading each project's boards.
     */
    let project_rows = {
        let mut stmt = conn
            .prepare(
                "
                SELECT id, name, position
                FROM projects
                WHERE in_trash = 0
                ORDER BY position ASC, name ASC
                ",
            )
            .map_err(|err| err.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i32>(2)?,
                ))
            })
            .map_err(|err| err.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|err| err.to_string())?;

        rows
    };

    let mut projects = Vec::new();

    for (project_id, project_name, project_position) in project_rows {
        let boards = {
            let mut statement = conn
                .prepare(
                    "
                    SELECT id, project_id, name, position
                    FROM boards
                    WHERE project_id = ?
                      AND in_trash = 0
                    ORDER BY position ASC, name ASC
                    ",
                )
                .map_err(|err| err.to_string())?;

            let rows = statement
                .query_map(params![project_id], |row| {
                    Ok(Board {
                        id: row.get(0)?,
                        project_id: row.get(1)?,
                        name: row.get(2)?,
                        position: row.get(3)?,
                    })
                })
                .map_err(|err| err.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|err| err.to_string())?;
            rows
        };

        projects.push(Project {
            id: project_id,
            name: project_name,
            position: project_position,
            boards,
        });
    }

    Ok(projects)
}

#[tauri::command]
pub fn create_project(app: tauri::AppHandle, name: String) -> Result<Project, String> {
    let name = name.trim();

    if name.is_empty() {
        return Err("Project name cannot be empty".to_string());
    }

    let conn = get_connection(&app).map_err(|err| err.to_string())?;

    let already_exists: bool = conn
        .query_row(
            "SELECT EXISTS(
         SELECT 1
         FROM projects
         WHERE name = ?
         )",
            params![name],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if already_exists {
        return Err(format!("A project named \"{name}\" already exists"));
    }

    let position: i32 = conn
        .query_row(
            "
        SELECT COALESCE(MAX(position),-1)+1
        FROM projects
        WHERE in_trash = 0
        ",
            [],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    let id = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "
        INSERT INTO projects (id,name,position)
        VALUES(?,?,?)
        ",
        params![id, name, position],
    )
    .map_err(|err| err.to_string())?;

    Ok(Project {
        id,
        name: name.to_string(),
        position,
        boards: Vec::new(),
    })
}

#[tauri::command]
pub fn create_board(app: tauri::AppHandle, project_id: i64, name: String) -> Result<Board, String> {
    let name = name.trim();

    if name.is_empty() {
        return Err("Board Name cannot be empty".to_string());
    }

    let conn = get_connection(&app).map_err(|err| err.to_string())?;

    let project_exists: bool = conn
        .query_row(
            "SELECT EXISTS(
                                             SELECT 1
                                             FROM projects
                                             WHERE id = ?
                                             AND in_trash= 0
                                             )",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if !project_exists {
        return Err("The selected project does not exist".to_string());
    }

    let board_exists: bool = conn
        .query_row(
            "
                SELECT EXISTS (
                    SELECT 1
                    FROM boards
                    WHERE project_id = ?
                      AND name = ?
                )
                ",
            params![project_id, name],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if board_exists {
        return Err(format!(
            "A board named \"{name}\" already exists in this project"
        ));
    }

    let position: i32 = conn
        .query_row(
            "
                   SELECT COALESCE(MAX(position), -1) + 1
                   FROM boards
                   WHERE project_id = ?
                     AND in_trash = 0
                   ",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    let id = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "
                   INSERT INTO boards (id, project_id, name, position)
                   VALUES (?, ?, ?, ?)
                   ",
        params![id, project_id, name, position],
    )
    .map_err(|err| err.to_string())?;

    Ok(Board {
        id,
        project_id,
        name: name.to_string(),
        position,
    })
}

#[tauri::command]
pub fn delete_board(
    app: tauri::AppHandle,
    project_id: i64,
    board_id: i64,
) -> Result<(), String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let board_exists: bool = tx
        .query_row(
            "SELECT EXISTS (
                SELECT 1
                FROM boards
                WHERE id = ?
                AND project_id = ?
                AND in_trash = 0
            )",
            params![board_id, project_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if !board_exists {
        return Err("Board does not exist".to_string());
    }

    let task_count: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE board_id = ?",
            params![board_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if task_count == 0 {
        tx.execute(
            "DELETE FROM boards WHERE id = ? AND project_id = ?",
            params![board_id, project_id],
        )
        .map_err(|err| err.to_string())?;
    } else {
        tx.execute(
            "UPDATE boards SET in_trash = 1 WHERE id = ? AND project_id = ?",
            params![board_id, project_id],
        )
        .map_err(|err| err.to_string())?;

        tx.execute(
            "UPDATE tasks SET in_trash = 1 WHERE board_id = ? AND in_trash = 0",
            params![board_id],
        )
        .map_err(|err| err.to_string())?;
    }

    tx.commit().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_project(app: tauri::AppHandle, project_id: i64) -> Result<(), String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let project_exists: bool = tx
        .query_row(
            "SELECT EXISTS (
                SELECT 1
                FROM projects
                WHERE id = ?
                AND in_trash = 0
            )",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if !project_exists {
        return Err("Project does not exist".to_string());
    }

    let task_count: i64 = tx
        .query_row(
            "SELECT COUNT(*)
             FROM tasks
             WHERE board_id IN (
                SELECT id FROM boards WHERE project_id = ?
             )",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    if task_count == 0 {
        tx.execute(
            "DELETE FROM boards WHERE project_id = ?",
            params![project_id],
        )
        .map_err(|err| err.to_string())?;

        tx.execute(
            "DELETE FROM projects WHERE id = ?",
            params![project_id],
        )
        .map_err(|err| err.to_string())?;
    } else {
        tx.execute(
            "UPDATE projects SET in_trash = 1 WHERE id = ?",
            params![project_id],
        )
        .map_err(|err| err.to_string())?;

        tx.execute(
            "UPDATE boards SET in_trash = 1 WHERE project_id = ?",
            params![project_id],
        )
        .map_err(|err| err.to_string())?;

        tx.execute(
            "UPDATE tasks
             SET in_trash = 1
             WHERE board_id IN (
                SELECT id FROM boards WHERE project_id = ?
             )
             AND in_trash = 0",
            params![project_id],
        )
        .map_err(|err| err.to_string())?;
    }

    tx.commit().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn move_just_task_board_to_project(
    app: tauri::AppHandle,
    just_task_id: i64,
    project_id: i64,
) -> Result<Board, String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let name: Option<String> = tx
        .query_row(
            "SELECT name FROM just_task_boards WHERE id = ? AND in_trash = 0",
            params![just_task_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|err| err.to_string())?;
    let name = name.ok_or_else(|| "JustTask does not exist".to_string())?;

    let project_exists: bool = tx
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ? AND in_trash = 0)",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    if !project_exists {
        return Err("Project does not exist".to_string());
    }

    let name_exists: bool = tx
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM boards WHERE project_id = ? AND name = ?)",
            params![project_id, name],
            |row| row.get(0),
    )
    .map_err(|err| err.to_string())?;
    if name_exists {
        return Err(format!(
            "A board named \"{name}\" already exists in this project"
        ));
    }

    let position: i32 = tx
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1
             FROM boards
             WHERE project_id = ?
               AND in_trash = 0",
            params![project_id],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;
    let id = chrono::Utc::now().timestamp_millis();

    tx.execute(
        "INSERT INTO boards (id, project_id, name, position) VALUES (?, ?, ?, ?)",
        params![id, project_id, name, position],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        "UPDATE tasks
         SET board_id = ?,
             just_task = 0,
             just_task_id = NULL
         WHERE just_task_id = ?",
        params![id, just_task_id],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        "DELETE FROM just_task_boards WHERE id = ?",
        params![just_task_id],
    )
    .map_err(|err| err.to_string())?;

    tx.commit().map_err(|err| err.to_string())?;

    Ok(Board {
        id,
        project_id,
        name,
        position,
    })
}
