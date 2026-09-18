#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <objbase.h>
#include <stdio.h>
#include <wchar.h>

#define HIVENUES_ALREADY_RUNNING 73
#define READY_TIMEOUT_MS 30000
#define POLL_MS 100

static int fail_message(const wchar_t *message) {
    MessageBoxW(NULL, message, L"HiVenues Studio", MB_OK | MB_ICONERROR);
    return 1;
}

static BOOL join_path(wchar_t *target, size_t count, const wchar_t *left, const wchar_t *right) {
    return swprintf_s(target, count, L"%ls\\%ls", left, right) > 0;
}

static BOOL executable_directory(wchar_t *target, size_t count) {
    DWORD length = GetModuleFileNameW(NULL, target, (DWORD)count);
    wchar_t *slash;
    if (length == 0 || length >= count) return FALSE;
    slash = wcsrchr(target, L'\\');
    if (slash == NULL) return FALSE;
    *slash = L'\0';
    return TRUE;
}

static BOOL regular_file_exists(const wchar_t *path) {
    DWORD attributes = GetFileAttributesW(path);
    return attributes != INVALID_FILE_ATTRIBUTES && (attributes & FILE_ATTRIBUTE_DIRECTORY) == 0;
}

static BOOL read_utf8_line(const wchar_t *path, wchar_t *target, int target_count) {
    HANDLE file;
    DWORD bytes_read = 0;
    char buffer[4096];
    int length;
    int converted;

    file = CreateFileW(
        path,
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        NULL,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );
    if (file == INVALID_HANDLE_VALUE) return FALSE;

    if (!ReadFile(file, buffer, sizeof(buffer) - 1, &bytes_read, NULL)) {
        CloseHandle(file);
        return FALSE;
    }
    CloseHandle(file);
    if (bytes_read == 0) return FALSE;

    buffer[bytes_read] = '\0';
    length = (int)bytes_read;
    while (length > 0 && (buffer[length - 1] == '\r' || buffer[length - 1] == '\n')) {
        buffer[--length] = '\0';
    }
    if (length == 0) return FALSE;

    converted = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, buffer, length, target, target_count - 1);
    if (converted <= 0) return FALSE;
    target[converted] = L'\0';
    return TRUE;
}

static BOOL current_url_path(wchar_t *target, size_t count) {
    PWSTR local_app_data = NULL;
    HRESULT result = SHGetKnownFolderPath(&FOLDERID_LocalAppData, KF_FLAG_DEFAULT, NULL, &local_app_data);
    int written;
    if (FAILED(result) || local_app_data == NULL) return FALSE;
    written = swprintf_s(
        target,
        count,
        L"%ls\\HiVenues Studio\\diagnostics\\current-url.txt",
        local_app_data
    );
    CoTaskMemFree(local_app_data);
    return written > 0;
}

static BOOL open_url(const wchar_t *url) {
    HINSTANCE result = ShellExecuteW(NULL, L"open", url, NULL, NULL, SW_SHOWNORMAL);
    return (INT_PTR)result > 32;
}

static BOOL contains_no_open(const wchar_t *arguments) {
    return arguments != NULL && wcsstr(arguments, L"--no-open") != NULL;
}

static int open_existing_runtime(BOOL no_open) {
    wchar_t path[MAX_PATH * 4];
    wchar_t url[2048];
    if (no_open) return 0;
    if (!current_url_path(path, _countof(path))) return fail_message(L"HiVenues Studio is already running, but its current URL could not be located.");
    if (!read_utf8_line(path, url, _countof(url))) return fail_message(L"HiVenues Studio is already running, but its current URL is not available yet.");
    if (!no_open && !open_url(url)) return fail_message(L"HiVenues Studio is running, but Windows could not open the Studio URL.");
    return 0;
}

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE previous, LPWSTR command_line, int show_command) {
    wchar_t root[MAX_PATH * 4];
    wchar_t runtime[MAX_PATH * 4];
    wchar_t app_root[MAX_PATH * 4];
    wchar_t script[MAX_PATH * 4];
    wchar_t temp_root[MAX_PATH * 4];
    wchar_t ready_file[MAX_PATH * 4];
    wchar_t url[2048];
    wchar_t *child_command = NULL;
    size_t child_count;
    DWORD temp_length;
    STARTUPINFOW startup;
    PROCESS_INFORMATION process;
    DWORD wait_result;
    DWORD exit_code = STILL_ACTIVE;
    DWORD elapsed = 0;
    BOOL no_open = contains_no_open(command_line);
    int result = 0;

    (void)instance;
    (void)previous;
    (void)show_command;

    if (!executable_directory(root, _countof(root))) return fail_message(L"HiVenues Studio could not resolve its installation directory.");
    if (!join_path(runtime, _countof(runtime), root, L"runtime\\node.exe")) return fail_message(L"HiVenues Studio runtime path is too long.");
    if (!join_path(app_root, _countof(app_root), root, L"app")) return fail_message(L"HiVenues Studio application path is too long.");
    if (!join_path(script, _countof(script), app_root, L"scripts\\hivenues-installed.js")) return fail_message(L"HiVenues Studio entry path is too long.");

    if (!regular_file_exists(runtime) || !regular_file_exists(script)) {
        return fail_message(L"HiVenues Studio is incomplete. Reinstall the application and try again.");
    }

    temp_length = GetTempPathW((DWORD)_countof(temp_root), temp_root);
    if (temp_length == 0 || temp_length >= _countof(temp_root)) return fail_message(L"HiVenues Studio could not resolve the temporary directory.");
    if (swprintf_s(
        ready_file,
        _countof(ready_file),
        L"%lsHiVenues-Studio-ready-%lu.txt",
        temp_root,
        GetCurrentProcessId()
    ) <= 0) {
        return fail_message(L"HiVenues Studio readiness path is too long.");
    }
    DeleteFileW(ready_file);

    child_count = wcslen(runtime) + wcslen(script) + wcslen(ready_file) + (command_line ? wcslen(command_line) : 0) + 96;
    child_command = (wchar_t *)HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, child_count * sizeof(wchar_t));
    if (child_command == NULL) return fail_message(L"HiVenues Studio could not allocate its launch command.");

    if (swprintf_s(
        child_command,
        child_count,
        L"\"%ls\" \"%ls\" %ls --ready-url-file \"%ls\"",
        runtime,
        script,
        command_line ? command_line : L"",
        ready_file
    ) <= 0) {
        HeapFree(GetProcessHeap(), 0, child_command);
        return fail_message(L"HiVenues Studio launch command is too long.");
    }

    ZeroMemory(&startup, sizeof(startup));
    startup.cb = sizeof(startup);
    ZeroMemory(&process, sizeof(process));

    if (!CreateProcessW(
        runtime,
        child_command,
        NULL,
        NULL,
        FALSE,
        CREATE_NO_WINDOW,
        NULL,
        app_root,
        &startup,
        &process
    )) {
        DWORD error = GetLastError();
        wchar_t message[512];
        HeapFree(GetProcessHeap(), 0, child_command);
        swprintf_s(message, _countof(message), L"HiVenues Studio could not start its private runtime. Windows error: %lu", error);
        return fail_message(message);
    }
    HeapFree(GetProcessHeap(), 0, child_command);

    for (;;) {
        if (read_utf8_line(ready_file, url, _countof(url))) {
            if (!no_open && !open_url(url)) {
                result = fail_message(L"HiVenues Studio started, but Windows could not open the Studio URL.");
            }
            DeleteFileW(ready_file);
            break;
        }

        wait_result = WaitForSingleObject(process.hProcess, POLL_MS);
        if (wait_result == WAIT_OBJECT_0) {
            if (!GetExitCodeProcess(process.hProcess, &exit_code)) exit_code = 1;
            DeleteFileW(ready_file);
            if (exit_code == HIVENUES_ALREADY_RUNNING) {
                result = open_existing_runtime(no_open);
            } else {
                wchar_t message[512];
                swprintf_s(message, _countof(message), L"HiVenues Studio stopped before it was ready. Exit code: %lu", exit_code);
                result = fail_message(message);
            }
            break;
        }
        if (wait_result == WAIT_FAILED) {
            DeleteFileW(ready_file);
            result = fail_message(L"HiVenues Studio could not monitor its private runtime.");
            break;
        }

        elapsed += POLL_MS;
        if (elapsed >= READY_TIMEOUT_MS) {
            DeleteFileW(ready_file);
            result = fail_message(L"HiVenues Studio is taking longer than expected to start. The runtime may still be running; see the HiVenues diagnostics folder for details.");
            break;
        }
    }

    CloseHandle(process.hThread);
    CloseHandle(process.hProcess);
    return result;
}
