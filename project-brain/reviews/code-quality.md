# Code Quality Review

* **Type Safety**: TypeScript configurations must use strict compiler options (such as `verbatimModuleSyntax`).
* **Dry Code**: Extract shared layout panels (such as sidebar and headers) into dedicated, reusable components.
* **Error Handlers**: Maintain try/catch statements inside async fetch wrappers on the frontend, and verify HTTP exceptions are issued clearly from backend routers.
* **Component Testing**: Establish basic render tests for critical forms and streaming widgets.
