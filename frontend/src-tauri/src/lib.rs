// // use tauri_plugin_shell::ShellExt;
// // use tauri::Manager;

// // #[cfg_attr(mobile, tauri::mobile_entry_point)]
// // pub fn run() {
// //     tauri::Builder::default()
// //         .plugin(tauri_plugin_log::Builder::new().build())
// //         .plugin(tauri_plugin_shell::init())
// //         .setup(|app| {
// //             let handle = app.handle().clone();
// //             // Get the resource directory where public folder will be
// //             let resource_dir = app.path().resource_dir()
// //                 .expect("failed to get resource dir")
// //                 .to_string_lossy()
// //                 .to_string();
// //             tauri::async_runtime::spawn(async move {
// //                 handle
// //                     .shell()
// //                     .sidecar("server")
// //                     .expect("failed to find server binary")
// //                     .envs([
// //                         ("PORT", "5001"),
// //                         ("MONGODB_URI", "mongodb+srv://deepudagar90_db_user:hRDq7jBeNSm9Jous@cluster0.zr6fuya.mongodb.net/?appName=Cluster0"),
// //                         ("localhost_database", "mongodb://127.0.0.1:27017/ifb"),
// //                         ("LOCAL_DB", "mongodb://127.0.0.1:27017/ifb"),
// //                         ("JWT_SECRET", "your_secret_key"),
// //                         ("NODE_ENV", "production"),
// //                         ("CLOUDINARY_CLOUD_NAME", "dygmcfkpc"),
// //                         ("CLOUDINARY_API_KEY", "984548845367288"),
// //                         ("CLOUDINARY_API_SECRET", "OdvQhqHaq1cf9C6z4iYwUJLZPKA"),
// //                         ("FRONTEND_PATH", &resource_dir),
// //                     ])
// //                     .spawn()
// //                     .expect("failed to spawn server");
// //             });
// //             Ok(())
// //         })
// //         .run(tauri::generate_context!())
// //         .expect("error while running tauri application");
// // }
// use tauri_plugin_shell::ShellExt;
// use tauri::Manager;

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_log::Builder::new().build())
//         .plugin(tauri_plugin_shell::init())
//         .setup(|app| {
//             let handle = app.handle().clone();

//             // This is where Tauri installs resource files
//             let resource_dir = app.path().resource_dir()
//                 .expect("failed to get resource dir");
            
//             // public folder will be inside resource dir
//             let frontend_path = resource_dir
//                 .join("public")
//                 .to_string_lossy()
//                 .to_string();

//             tauri::async_runtime::spawn(async move {
//                 handle
//                     .shell()
//                     .sidecar("server")
//                     .expect("failed to find server binary")
//                     .envs([
//                         ("PORT", "5001"),
//                         ("MONGODB_URI", "mongodb+srv://deepudagar90_db_user:hRDq7jBeNSm9Jous@cluster0.zr6fuya.mongodb.net/?appName=Cluster0"),
//                         ("localhost_database", "mongodb://127.0.0.1:27017/ifb"),
//                         ("LOCAL_DB", "mongodb://127.0.0.1:27017/ifb"),
//                         ("JWT_SECRET", "your_secret_key"),
//                         ("NODE_ENV", "production"),
//                         ("CLOUDINARY_CLOUD_NAME", "dygmcfkpc"),
//                         ("CLOUDINARY_API_KEY", "984548845367288"),
//                         ("CLOUDINARY_API_SECRET", "OdvQhqHaq1cf9C6z4iYwUJLZPKA"),
//                         ("FRONTEND_PATH", &frontend_path),
//                     ])
//                     .spawn()
//                     .expect("failed to spawn server");
//             });
//             Ok(())
//         })
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
// use tauri_plugin_shell::ShellExt;
// use tauri::Manager;

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_log::Builder::new().build())
//         .plugin(tauri_plugin_shell::init())
//         .setup(|app| {
//             let handle = app.handle().clone();

//             // Get the install directory (where app.exe lives)
//             let install_dir = app.path().resource_dir()
//                 .expect("failed to get resource dir");

//             // public folder is inside binaries/
//             let frontend_path = install_dir
//                 .join("binaries")
//                 .join("public")
//                 .to_string_lossy()
//                 .to_string();

//             tauri::async_runtime::spawn(async move {
//                 handle
//                     .shell()
//                     .sidecar("server")
//                     .expect("failed to find server binary")
//                     .envs([
//                         ("PORT", "5001"),
//                         ("MONGODB_URI", "mongodb+srv://deepudagar90_db_user:hRDq7jBeNSm9Jous@cluster0.zr6fuya.mongodb.net/?appName=Cluster0"),
//                         ("localhost_database", "mongodb://127.0.0.1:27017/ifb"),
//                         ("LOCAL_DB", "mongodb://127.0.0.1:27017/ifb"),
//                         ("JWT_SECRET", "your_secret_key"),
//                         ("NODE_ENV", "production"),
//                         ("CLOUDINARY_CLOUD_NAME", "dygmcfkpc"),
//                         ("CLOUDINARY_API_KEY", "984548845367288"),
//                         ("CLOUDINARY_API_SECRET", "OdvQhqHaq1cf9C6z4iYwUJLZPKA"),
//                         ("FRONTEND_PATH", &frontend_path),
//                     ])
//                     .spawn()
//                     .expect("failed to spawn server");
//             });
//             Ok(())
//         })
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
// use tauri_plugin_shell::ShellExt;
// use tauri::Manager;

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_log::Builder::new().build())
//         .plugin(tauri_plugin_shell::init())
//         .setup(|app| {
//             let handle = app.handle().clone();

//             // Files install flat — use the directory containing app.exe
//             let exe_dir = std::env::current_exe()
//                 .expect("failed to get exe path")
//                 .parent()
//                 .expect("failed to get exe dir")
//                 .to_path_buf();

//             let frontend_path = exe_dir.join("binaries").join("public").to_string_lossy().to_string();

//             println!("EXE dir: {}", frontend_path);

//             tauri::async_runtime::spawn(async move {
//                 let sidecar_result = handle.shell().sidecar("server");

//                 match sidecar_result {
//                     Ok(sidecar) => {
//                         let spawn_result = sidecar
//                             .envs([
//                                 ("PORT", "5001"),
//                                 ("HOST", "0.0.0.0"),
//                                 ("MONGODB_URI", "mongodb+srv://deepudagar90_db_user:hRDq7jBeNSm9Jous@cluster0.zr6fuya.mongodb.net/?appName=Cluster0"),
//                                 ("localhost_database", "mongodb://127.0.0.1:27017/ifb"),
//                                 ("LOCAL_DB", "mongodb://127.0.0.1:27017/ifb"),
//                                 ("JWT_SECRET", "your_secret_key"),
//                                 ("NODE_ENV", "production"),
//                                 ("CLOUDINARY_CLOUD_NAME", "dygmcfkpc"),
//                                 ("CLOUDINARY_API_KEY", "984548845367288"),
//                                 ("CLOUDINARY_API_SECRET", "OdvQhqHaq1cf9C6z4iYwUJLZPKA"),
//                                 ("FRONTEND_PATH", &frontend_path),
//                                 ("FTP_PORT", "2121"),
//                                 ("FTP_USER","ifbftpuser"),
//                                 ("FTP_PASS","ifb@ftp2026"),
//                                 ("FTP_HOST","0.0.0.0"),
//                             ])
//                             .spawn();
//                         match spawn_result {
//                             Ok(_) => println!("Server started successfully"),
//                             Err(e) => eprintln!("Failed to spawn server: {}", e),
//                         }
//                     }
//                     Err(e) => eprintln!("Failed to find sidecar: {}", e),
//                 }
//             });
//             Ok(())
//         })
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    // Kill any leftover server.exe from a previous session
    let _ = std::process::Command::new("taskkill")
        .args(["/F", "/IM", "server.exe"])
        .output();

    // Give the OS 800ms to fully release the ports
    std::thread::sleep(std::time::Duration::from_millis(800));

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();

            let exe_dir = std::env::current_exe()
                .expect("failed to get exe path")
                .parent()
                .expect("failed to get exe dir")
                .to_path_buf();
            let env_path = exe_dir.join("binaries").join(".env").to_string_lossy().to_string();
            let frontend_path = exe_dir
                .join("binaries")
                .join("public")
                .to_string_lossy()
                .to_string();

            println!("EXE dir: {}", frontend_path);

            tauri::async_runtime::spawn(async move {
                loop {
                    println!("🚀 Starting server sidecar...");

                    let sidecar_result = handle.shell().sidecar("server");

                    match sidecar_result {
                        Ok(sidecar) => {
                            let spawn_result = sidecar
                                .envs([
                                    ("PORT", "5001"),
                                    ("HOST", "0.0.0.0"),
                                    ("MONGODB_URI", "mongodb+srv://deepudagar90_db_user:hRDq7jBeNSm9Jous@cluster0.zr6fuya.mongodb.net/?appName=Cluster0"),
                                    ("localhost_database", "mongodb://127.0.0.1:27017/ifb"),
                                    ("LOCAL_DB", "mongodb://127.0.0.1:27017/ifb"),
                                    ("JWT_SECRET", "your_secret_key"),
                                    ("NODE_ENV", "production"),
                                    ("CLOUDINARY_CLOUD_NAME", "dygmcfkpc"),
                                    ("CLOUDINARY_API_KEY", "984548845367288"),
                                    ("CLOUDINARY_API_SECRET", "OdvQhqHaq1cf9C6z4iYwUJLZPKA"),
                                    ("FRONTEND_PATH", &frontend_path),
                                    ("FTP_PORT", "2121"),
                                    ("FTP_USER", "ifbftpuser"),
                                    ("FTP_PASS", "ifb@ftp2026"),
                                    ("FTP_HOST", "0.0.0.0"),
                                ])
                                .spawn();

                            match spawn_result {
                                Ok((mut receiver, _child)) => {
                                    println!("✅ Server started successfully");
                                    // Wait until the process exits (channel closes)
                                    while let Some(_event) = receiver.recv().await {}
                                    println!("⚠️ Server exited — restarting in 3s...");
                                }
                                Err(e) => {
                                    eprintln!("❌ Failed to spawn server: {}", e);
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("❌ Failed to find sidecar: {}", e);
                        }
                    }

                    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 