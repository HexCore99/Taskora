use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// crate means current Rust Project/Module. crate = root
use crate::db::get_connection;

//pass extra info to compiler.
#[derive(Serialize, Deserialize)] //Tell the compiler that, task can be converted to JSON.
pub struct Note {
    id: i64,
    task_id: i64,
    #[serde(rename = "completed")]
    is_completed: bool,
    #[serde(rename = "text")]
    description: String,
    creation_date: String,
    modified_date: String,
}

#[derive(Serialize, Deserialize)] //Tell the compiler that, task can be converted to JSON.
pub struct Task {
    id: i64,
    #[serde(default)]
    board_id: Option<i64>,
    #[serde(default)]
    just_task: bool,
    #[serde(default)]
    just_task_id: Option<i64>,
    name: String,
    status: String,
    position: i32,
    priority: i32,
    due_date: Option<String>,
    description: Option<String>,
    #[serde(default)]
    notes: Vec<Note>,
}

fn get_task_with_note_handler(
    mut tasks: Vec<Task>,
    conn: &Connection,
) -> Result<Vec<Task>, String> {
    let mut note_stmt = conn
        .prepare(
            "
            SELECT
            id,
            task_id,
            is_completed,
            description,
            creation_date,
            modified_date
            FROM notes
            WHERE task_id = ?
            ORDER BY creation_date ASC
            ",
        )
        .map_err(|err| err.to_string())?;

    for task in &mut tasks {
        task.notes = note_stmt
            .query_map(params![task.id], |row| {
                Ok(Note {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    is_completed: row.get(2)?,
                    description: row.get(3)?,
                    creation_date: row.get(4)?,
                    modified_date: row.get(5)?,
                })
            })
            .map_err(|err| err.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|err| err.to_string())?;
    }

    Ok(tasks)
}

// flag
#[tauri::command] // allow this function to be called from the frontend
pub fn get_tasks(
    app: tauri::AppHandle,
    board_id: Option<i64>,
    include_all: bool,
) -> Result<Vec<Task>, String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let mut stmt = tx
        .prepare(
            "
            SELECT id,board_id,name,status,position,priority,due_date,description,just_task,just_task_id
            FROM tasks
            WHERE in_trash = 0
            AND (? = 1 OR board_id IS ?)
            ORDER BY position ASC
            ",
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map(params![include_all, board_id], |row| {
            Ok(Task {
                id: row.get(0)?,
                board_id: row.get(1)?,
                name: row.get(2)?,
                status: row.get(3)?,
                position: row.get(4)?,
                priority: row.get(5)?,
                due_date: row.get(6)?,
                description: row.get(7)?,
                just_task: row.get(8)?,
                just_task_id: row.get(9)?,
                notes: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    drop(stmt);
    let tasks = get_task_with_note_handler(tasks, &tx)?;
    tx.commit().map_err(|err| err.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn get_just_tasks(app: tauri::AppHandle, just_task_id: i64) -> Result<Vec<Task>, String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let mut stmt = tx
        .prepare(
            "
            SELECT id,board_id,name,status,position,priority,due_date,description,just_task,just_task_id
            FROM tasks
            WHERE in_trash = 0
            AND just_task = 1
            AND just_task_id = ?
            AND board_id IS NULL
            ORDER BY position ASC
            ",
        )
        .map_err(|err| err.to_string())?;

    let tasks = stmt
        .query_map(params![just_task_id], |row| {
            Ok(Task {
                id: row.get(0)?,
                board_id: row.get(1)?,
                name: row.get(2)?,
                status: row.get(3)?,
                position: row.get(4)?,
                priority: row.get(5)?,
                due_date: row.get(6)?,
                description: row.get(7)?,
                just_task: row.get(8)?,
                just_task_id: row.get(9)?,
                notes: Vec::new(),
            })
        })
        .map_err(|err| err.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())?;

    drop(stmt);
    let tasks = get_task_with_note_handler(tasks, &tx)?;
    tx.commit().map_err(|err| err.to_string())?;

    Ok(tasks)
}

// flag
#[tauri::command]
pub fn get_today_tasks(app: tauri::AppHandle) -> Result<Vec<Task>, String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let now = chrono::Local::now();
    let today = now.date_naive();

    let mut stmt = tx
        .prepare(
            "
            SELECT id,board_id,name,status,position,priority,due_date,description,just_task,just_task_id
            FROM tasks
            WHERE in_trash = 0
            AND due_date = ?
            ORDER BY creation_date DESC, id DESC
            ",
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map(params![today], |row| {
            Ok(Task {
                id: row.get(0)?,
                board_id: row.get(1)?,
                name: row.get(2)?,
                status: row.get(3)?,
                position: row.get(4)?,
                priority: row.get(5)?,
                due_date: row.get(6)?,
                description: row.get(7)?,
                just_task: row.get(8)?,
                just_task_id: row.get(9)?,
                notes: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    drop(stmt);
    let tasks = get_task_with_note_handler(tasks, &tx)?;
    tx.commit().map_err(|err| err.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn get_upcoming_tasks(app: tauri::AppHandle) -> Result<Vec<Task>, String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let now = chrono::Local::now();
    let today = now.date_naive();

    let mut stmt = tx
        .prepare(
            "
            SELECT id,board_id,name,status,position,priority,due_date,description,just_task,just_task_id
            FROM tasks
            WHERE in_trash = 0
            AND due_date > ?
            ORDER BY creation_date DESC, id DESC
            ",
        )
        .map_err(|e| e.to_string())?;

    let tasks = stmt
        .query_map(params![today], |row| {
            Ok(Task {
                id: row.get(0)?,
                board_id: row.get(1)?,
                name: row.get(2)?,
                status: row.get(3)?,
                position: row.get(4)?,
                priority: row.get(5)?,
                due_date: row.get(6)?,
                description: row.get(7)?,
                just_task: row.get(8)?,
                just_task_id: row.get(9)?,
                notes: Vec::new(),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    drop(stmt);
    let tasks = get_task_with_note_handler(tasks, &tx)?;
    tx.commit().map_err(|err| err.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn get_trash_tasks(app: tauri::AppHandle) -> Result<Vec<Task>, String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let mut stmt = tx
        .prepare(
            "SELECT id,board_id,name,status,position,priority,due_date,description,just_task,just_task_id
          FROM tasks
          WHERE in_trash = 1
          ORDER BY position ASC",
        )
        .map_err(|err| err.to_string())?;
    let tasks = stmt
        .query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                board_id: row.get(1)?,
                name: row.get(2)?,
                status: row.get(3)?,
                position: row.get(4)?,
                priority: row.get(5)?,
                due_date: row.get(6)?,
                description: row.get(7)?,
                just_task: row.get(8)?,
                just_task_id: row.get(9)?,
                notes: Vec::new(),
            })
        })
        .map_err(|err| err.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())?;

    drop(stmt);
    let tasks = get_task_with_note_handler(tasks, &tx)?;
    tx.commit().map_err(|err| err.to_string())?;
    Ok(tasks)
}

#[tauri::command]
pub fn create_task(
    app: tauri::AppHandle,
    name: String,
    status: String,
    priority: i32,
    due_date: Option<String>,
    description: Option<String>,
    board_id: Option<i64>,
    just_task: bool,
    just_task_id: Option<i64>,
) -> Result<(), String> {
    let name = name.trim();

    if name.is_empty() {
        return Err("Task name cannot be empty".to_string());
    }

    if !matches!(status.as_str(), "todo" | "in-progress" | "completed") {
        return Err("Invalid task status".to_string());
    }

    if !(1..=4).contains(&priority) {
        return Err("Priority must be between 1 and 4".to_string());
    }

    if just_task && board_id.is_some() {
        return Err("A JustTask cannot belong to a board".to_string());
    }

    if just_task != just_task_id.is_some() {
        return Err("JustTask tasks require a JustTask board".to_string());
    }

    let description = description.and_then(|value| {
        let trimmed = value.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    });

    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now();
    let id = now.timestamp_millis(); // chrono -> time library
    let creation_date = now.to_rfc3339();

    if let Some(selected_board_id) = board_id {
        let board_exists: bool = tx
            .query_row(
                "SELECT EXISTS(
                    SELECT 1
                    FROM boards
                    JOIN projects ON projects.id = boards.project_id
                    WHERE boards.id = ?
                    AND boards.in_trash = 0
                    AND projects.in_trash = 0
                )",
                params![selected_board_id],
                |row| row.get(0),
            )
            .map_err(|err| err.to_string())?;

        if !board_exists {
            return Err("The selected board does not exist".to_string());
        }
    }

    if let Some(selected_just_task_id) = just_task_id {
        let just_task_board_exists: bool = tx
            .query_row(
                "SELECT EXISTS(
                    SELECT 1
                    FROM just_task_boards
                    WHERE id = ?
                      AND in_trash = 0
                )",
                params![selected_just_task_id],
                |row| row.get(0),
            )
            .map_err(|err| err.to_string())?;

        if !just_task_board_exists {
            return Err("The selected JustTask board does not exist".to_string());
        }
    }

    // Make room at the top of the destination column.
    tx.execute(
        "UPDATE tasks
         SET position = position + 1
         WHERE board_id IS ?
         AND just_task = ?
         AND just_task_id IS ?
         AND status = ?
         AND in_trash = 0",
        params![board_id, just_task, just_task_id, status],
    )
    .map_err(|e| e.to_string())?;

    // insert with new pos
    tx.execute(
        "INSERT INTO tasks
                 (id,board_id,name,status,position,priority,due_date,description,creation_date,just_task,just_task_id)
                 VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        params![
            id,
            board_id,
            name,
            status,
            0,
            priority,
            due_date,
            description,
            creation_date,
            just_task,
            just_task_id
        ],
    )
    .map_err(|err| err.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_position(
    app: tauri::AppHandle,
    tasks: Vec<Task>,
    board_id: Option<i64>,
    include_all: bool,
    just_task_id: Option<i64>,
) -> Result<(), String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let mut positions: HashMap<(Option<i64>, Option<i64>, String), i32> = HashMap::new();

    for task in tasks {
        if !include_all && (task.board_id != board_id || task.just_task_id != just_task_id) {
            return Err("Cannot reorder tasks from different boards".to_string());
        }

        if !matches!(task.status.as_str(), "todo" | "in-progress" | "completed") {
            return Err(format!("Unknown task status: {}", task.status));
        }

        let position_key = (task.board_id, task.just_task_id, task.status.clone());
        let next_position = positions.entry(position_key).or_insert(0);
        let position = *next_position;
        *next_position += 1;

        tx.execute(
            "UPDATE tasks
             SET position = ?
             WHERE id = ?
             AND board_id IS ?
             AND just_task = ?
             AND just_task_id IS ?",
            params![
                position,
                task.id,
                task.board_id,
                task.just_task,
                task.just_task_id
            ],
        )
        .map_err(|err| err.to_string())?;
    }
    tx.commit().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn set_task_location(
    app: tauri::AppHandle,
    id: i64,
    board_id: Option<i64>,
    just_task_id: Option<i64>,
    status: String,
) -> Result<(), String> {
    if !matches!(status.as_str(), "todo" | "in-progress" | "completed") {
        return Err("Invalid task status".to_string());
    }

    if board_id.is_some() && just_task_id.is_some() {
        return Err("A task can only have one destination".to_string());
    }

    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let task_location: Option<(Option<i64>, bool, Option<i64>, String, i32)> = tx
        .query_row(
            "SELECT board_id, just_task, just_task_id, status, position
             FROM tasks
             WHERE id = ?
               AND in_trash = 0",
            params![id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .optional()
        .map_err(|err| err.to_string())?;

    let (current_board_id, current_just_task, current_just_task_id, current_status, position) =
        task_location.ok_or_else(|| "Task does not exist".to_string())?;

    if let Some(selected_board_id) = board_id {
        let board_exists: bool = tx
            .query_row(
                "SELECT EXISTS(
                    SELECT 1
                    FROM boards
                    JOIN projects ON projects.id = boards.project_id
                    WHERE boards.id = ?
                      AND boards.in_trash = 0
                      AND projects.in_trash = 0
                )",
                params![selected_board_id],
                |row| row.get(0),
            )
            .map_err(|err| err.to_string())?;

        if !board_exists {
            return Err("The selected board does not exist".to_string());
        }
    }

    if let Some(selected_just_task_id) = just_task_id {
        let just_task_board_exists: bool = tx
            .query_row(
                "SELECT EXISTS(
                    SELECT 1
                    FROM just_task_boards
                    WHERE id = ?
                      AND in_trash = 0
                )",
                params![selected_just_task_id],
                |row| row.get(0),
            )
            .map_err(|err| err.to_string())?;

        if !just_task_board_exists {
            return Err("The selected JustTask board does not exist".to_string());
        }
    }

    let destination_is_just_task = just_task_id.is_some();
    if current_board_id == board_id
        && current_just_task_id == just_task_id
        && current_just_task == destination_is_just_task
        && current_status == status
    {
        tx.commit().map_err(|err| err.to_string())?;
        return Ok(());
    }

    tx.execute(
        "UPDATE tasks
         SET position = position - 1
        WHERE board_id IS ?
           AND just_task = ?
           AND just_task_id IS ?
           AND status = ?
           AND position > ?
           AND id != ?
           AND in_trash = 0",
        params![
            current_board_id,
            current_just_task,
            current_just_task_id,
            current_status,
            position,
            id
        ],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        "UPDATE tasks
         SET position = position + 1
        WHERE board_id IS ?
           AND just_task = ?
           AND just_task_id IS ?
           AND status = ?
           AND in_trash = 0",
        params![
            board_id,
            destination_is_just_task,
            just_task_id,
            status
        ],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        "UPDATE tasks
         SET board_id = ?,
             just_task = ?,
             just_task_id = ?,
             status = ?,
             position = 0
         WHERE id = ?
           AND in_trash = 0",
        params![
            board_id,
            destination_is_just_task,
            just_task_id,
            status,
            id
        ],
    )
    .map_err(|err| err.to_string())?;

    tx.commit().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_task_status(app: tauri::AppHandle, id: i64, status: String) -> Result<(), String> {
    let conn = get_connection(&app)?;

    let sql = "UPDATE tasks
                SET status = ?
                WHERE id = ?";
    conn.execute(sql, params![status, id])
        .map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_task_name(
    app: tauri::AppHandle,
    id: i64,
    updated_task: String,
) -> Result<(), String> {
    let conn = get_connection(&app).map_err(|err| err.to_string())?;

    conn.execute(
        "UPDATE tasks
             SET name = ?
             WHERE id =?",
        params![updated_task, id],
    )
    .map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn move_to_trash(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = get_connection(&app)?;

    conn.execute(
        " UPDATE tasks
          SET in_trash = 1
          WHERE id = ?",
        params![id],
    )
    .map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn restore_from_trash(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let (board_id, just_task_id): (Option<i64>, Option<i64>) = tx
        .query_row(
            "SELECT board_id, just_task_id
             FROM tasks
             WHERE id = ?
             AND in_trash = 1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|err| err.to_string())?
        .ok_or_else(|| "Trashed task does not exist".to_string())?;

    if let Some(board_id) = board_id {
        tx.execute(
            "UPDATE projects
             SET in_trash = 0
             WHERE id = (
                SELECT project_id FROM boards WHERE id = ?
             )",
            params![board_id],
        )
        .map_err(|err| err.to_string())?;

        tx.execute(
            "UPDATE boards SET in_trash = 0 WHERE id = ?",
            params![board_id],
        )
        .map_err(|err| err.to_string())?;
    }

    if let Some(just_task_id) = just_task_id {
        tx.execute(
            "UPDATE just_task_boards
             SET in_trash = 0
             WHERE id = ?",
            params![just_task_id],
        )
        .map_err(|err| err.to_string())?;
    }

    tx.execute("UPDATE tasks SET in_trash = 0 WHERE id = ?", params![id])
        .map_err(|err| err.to_string())?;

    tx.commit().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_from_trash(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    tx.execute(
        "DELETE FROM notes
         WHERE task_id IN (
            SELECT id FROM tasks
            WHERE id = ? AND in_trash = 1
         )",
        params![id],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        " DELETE FROM tasks
          WHERE id = ?
          AND in_trash = 1",
        params![id],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        "DELETE FROM boards
         WHERE in_trash = 1
         AND NOT EXISTS (
            SELECT 1 FROM tasks WHERE tasks.board_id = boards.id
         )",
        [],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        "DELETE FROM projects
         WHERE in_trash = 1
         AND NOT EXISTS (
            SELECT 1 FROM boards WHERE boards.project_id = projects.id
         )",
        [],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        "DELETE FROM just_task_boards
         WHERE in_trash = 1
         AND NOT EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.just_task_id = just_task_boards.id
         )",
        [],
    )
    .map_err(|err| err.to_string())?;

    tx.commit().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn empty_trash(app: tauri::AppHandle) -> Result<(), String> {
    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    tx.execute(
        "DELETE FROM notes
         WHERE task_id IN (
            SELECT id FROM tasks WHERE in_trash = 1
         )",
        [],
    )
    .map_err(|err| err.to_string())?;

    tx.execute(
        " DELETE FROM tasks
          WHERE in_trash = 1",
        [],
    )
    .map_err(|err| err.to_string())?;

    tx.execute("DELETE FROM boards WHERE in_trash = 1", [])
        .map_err(|err| err.to_string())?;

    tx.execute("DELETE FROM just_task_boards WHERE in_trash = 1", [])
        .map_err(|err| err.to_string())?;

    tx.execute(
        "DELETE FROM projects
         WHERE in_trash = 1
         AND NOT EXISTS (
            SELECT 1 FROM boards WHERE boards.project_id = projects.id
         )",
        [],
    )
    .map_err(|err| err.to_string())?;

    tx.commit().map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn set_due_date(
    app: tauri::AppHandle,
    id: i64,
    due_date: Option<String>,
) -> Result<(), String> {
    let conn = get_connection(&app).map_err(|err| err.to_string())?;

    conn.execute(
        "UPDATE tasks SET due_date = ? WHERE id = ?",
        params![due_date, id],
    )
    .map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn set_priority(app: tauri::AppHandle, id: i64, priority: i32) -> Result<(), String> {
    let conn = get_connection(&app).map_err(|err| err.to_string())?;

    conn.execute(
        "UPDATE tasks SET priority = ? WHERE id = ?",
        params![priority, id],
    )
    .map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn set_description(
    app: tauri::AppHandle,
    id: i64,
    description: Option<String>,
) -> Result<(), String> {
    let conn = get_connection(&app).map_err(|err| err.to_string())?;

    conn.execute(
        "UPDATE tasks SET description = ? WHERE id = ?",
        params![description, id],
    )
    .map_err(|err| err.to_string())?;

    Ok(())
}

// flag
#[tauri::command]
pub fn sort_tasks(
    app: tauri::AppHandle,
    column_name: String,
    sort_option: String,
    board_id: Option<i64>,
    include_all: bool,
    task_view: String,
    just_task_id: Option<i64>,
) -> Result<Vec<Task>, String> {
    if !matches!(column_name.as_str(), "todo" | "in-progress" | "completed") {
        return Err(format!("Invalid column name: {}", column_name));
    }

    if !matches!(
        task_view.as_str(),
        "board" | "just-tasks" | "today" | "upcoming"
    ) {
        return Err(format!("Invalid task view: {}", task_view));
    }

    let mut conn = get_connection(&app)?;
    let tx = conn.transaction().map_err(|err| err.to_string())?;

    let order_by_clause = match sort_option.as_str() {
        "default" if !matches!(task_view.as_str(), "board" | "just-tasks") || include_all => {
            "creation_date DESC, id DESC"
        }
        "default" => "position ASC",
        "date-asc" => {
            "CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, creation_date DESC, id DESC"
        }
        "date-desc" => {
            "CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date DESC, creation_date DESC, id DESC"
        }
        "priority-high" => "priority ASC",
        "priority-low" => "priority DESC",
        _ => return Err(format!("Unknown sort option: {}", sort_option)),
    };

    let today = chrono::Local::now().date_naive();
    let query = format!(
        "SELECT id,board_id,name,status,position,priority,due_date,description,just_task,just_task_id
         FROM tasks
         WHERE status = ?1
         AND in_trash = 0
         AND (
            (?2 = 'today' AND due_date = ?3)
            OR (?2 = 'upcoming' AND due_date > ?3)
            OR (?2 = 'board' AND (?4 = 1 OR board_id IS ?5))
            OR (?2 = 'just-tasks' AND just_task = 1 AND just_task_id IS ?6 AND board_id IS NULL)
         )
         ORDER BY {}",
        order_by_clause
    );

    let mut stmt = tx.prepare(&query).map_err(|err| err.to_string())?;

    let tasks = stmt
        .query_map(
            params![
                column_name,
                task_view,
                today,
                include_all,
                board_id,
                just_task_id
            ],
            |row| {
                Ok(Task {
                    id: row.get(0)?,
                    board_id: row.get(1)?,
                    name: row.get(2)?,
                    status: row.get(3)?,
                    position: row.get(4)?,
                    priority: row.get(5)?,
                    due_date: row.get(6)?,
                    description: row.get(7)?,
                    just_task: row.get(8)?,
                    just_task_id: row.get(9)?,
                    notes: Vec::new(),
                })
            },
        )
        .map_err(|err| err.to_string())?
        .collect::<Result<Vec<Task>, _>>()
        .map_err(|err| err.to_string())?;

    drop(stmt);
    let tasks = get_task_with_note_handler(tasks, &tx)?;
    tx.commit().map_err(|err| err.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn create_note(
    app: tauri::AppHandle,
    task_id: i64,
    is_completed: bool,
    description: String,
) -> Result<Note, String> {
    if description.trim().is_empty() {
        return Err("note can't be empty".to_string());
    }

    let conn = get_connection(&app).map_err(|err| err.to_string())?;
    let today = chrono::Local::now().format("%H:%M:%S").to_string();

    conn.execute(
        "
        INSERT INTO notes(task_id,is_completed,description,creation_date,modified_date)
        VALUES(?,?,?,?,?)
        ",
        params![task_id, is_completed, description, today, today],
    )
    .map_err(|err| err.to_string())?;
    let id = conn.last_insert_rowid();

    Ok(Note {
        id,
        task_id,
        is_completed,
        description,
        creation_date: today.clone(),
        modified_date: today,
    })
}

#[tauri::command]
pub fn update_note(
    app: tauri::AppHandle,
    note_id: i64,
    task_id: i64,
    description: String,
    is_completed: bool,
) -> Result<(), String> {
    if description.trim().is_empty() {
        return Err("note can't be empty".to_string());
    }

    let conn = get_connection(&app).map_err(|err| err.to_string())?;
    let today = chrono::Local::now().format("%H:%M:%S").to_string();

    let updated_rows = conn
        .execute(
            "
        UPDATE notes
        SET description = ?, is_completed = ?, modified_date = ?
        WHERE id = ? AND task_id = ?
        ",
            params![description, is_completed, today, note_id, task_id],
        )
        .map_err(|err| err.to_string())?;

    if updated_rows == 0 {
        return Err("note not found".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn delete_note(app: tauri::AppHandle, note_id: i64, task_id: i64) -> Result<(), String> {
    let conn = get_connection(&app).map_err(|err| err.to_string())?;

    let deleted_rows = conn
        .execute(
            "
        DELETE FROM notes
        WHERE id = ? AND task_id = ?
        ",
            params![note_id, task_id],
        )
        .map_err(|err| err.to_string())?;

    if deleted_rows == 0 {
        return Err("note not found".to_string());
    }

    Ok(())
}
