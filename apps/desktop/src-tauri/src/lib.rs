use std::sync::Mutex;
use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct ApiSidecar(Mutex<Option<CommandChild>>);

fn spawn_api_sidecar(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar = app
        .shell()
        .sidecar("binaries/storyloom-api")
        .map_err(|e| format!("failed to resolve API sidecar: {e}"))?;

    let (_rx, child) = sidecar
        .spawn()
        .map_err(|e| format!("failed to spawn API sidecar: {e}"))?;

    app.manage(ApiSidecar(Mutex::new(Some(child))));
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                spawn_api_sidecar(app)?;
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<ApiSidecar>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
