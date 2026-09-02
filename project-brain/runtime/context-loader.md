# Context Loader

This script/module manages loading correct project metadata to optimize token usage.

## Loader Execution Steps
1. Query `project-brain/cache/` to identify the last active files and changes.
2. Query `project-brain/memory/` for core requirements and definitions.
3. Query `project-brain/system/` for system definitions.
4. Retrieve relevant source code files only.

*Warning: Never load the entire repository unless explicitly requested by the user.*
