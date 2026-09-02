# Memory Updater

Determines how Project Brain is kept in sync with development.

## Update Rules
* Only rewrite the specific documents affected by the execution.
* Never rebuild or regenerate the entire `project-brain/` database.
* Always update `project-brain/tasks/changelog.md` with incremental details.
* Update cache records to ensure the next task starts with updated indexes.
