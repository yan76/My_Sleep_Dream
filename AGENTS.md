# Project Agent Notes

- Encoding note: in Windows PowerShell 5.1, read Chinese text files with `Get-Content -Encoding UTF8 -Raw <path>`.
- 完成功能后如需调用浏览器，必须先取得用户批准。
- 当用户询问看法、方案，或要求规划交互文档/方案时，只提供待审核内容；必须等用户审核并明确要求执行后，才可以开始执行。
- 本项目中文文档与源码按 UTF-8 保存。Windows PowerShell 5.1 默认读取无 BOM UTF-8 文件时可能误用系统 ANSI 编码，导致中文显示成乱码。
- 读取中文文件时必须显式指定 UTF-8，例如 `Get-Content -Encoding UTF8 -Raw <path>`。不要因为普通 `Get-Content` 输出乱码就判断文件损坏；先用显式 UTF-8 或 `git show` 复核。
