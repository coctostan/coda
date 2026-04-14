Execute Python code with local programmatic tool calling.

Prefer this tool first for repo-wide analysis, repeated lookups, loops, grouping, ranking, counting, filtering, or any task with 3+ dependent tool calls. Use direct tools instead for one-file reads, one-off grep/find calls, or tiny lookups.
Strong signals to use code_execution:
- Scan many files and return counts, grouped summaries, rankings, or compact JSON
- Run the same tool across many inputs and aggregate the results
- Keep large intermediate results out of the chat context
Examples:
- Count imports across src/**/*.ts and return the top 10 packages
- Analyze the first 8 test files and return compact JSON only
- Check many endpoints or records, then return only the failures
Important rules:
- Top-level await is already available. Do not call asyncio.run(...).
- Use generated helpers such as read(), glob(), find(), grep(), ls(), and ptc.* helpers. Do not call _rpc_call(...) directly.
- Return a compact final answer only. If you return a dict/list, it will be JSON-serialized automatically.
- Intermediate tool results stay local to this tool run and are not sent back to the model unless you include them in the final output.
- Prefer compact JSON summaries over raw dumps.
- Docker isolation is required for this session; if Docker is unavailable, execution fails instead of falling back to subprocess.
Prefer these patterns:
- Many file reads from explicit paths: ptc.read_many(paths, max_concurrency=...)
- Find and read an entire tree: ptc.read_tree(pattern=..., path=..., max_files=..., concurrency=...)
- Bounded concurrency for arbitrary coroutines: ptc.gather_limit(coros, limit=...)
- Relative file discovery: glob(...) or ptc.find_files(...)
- Absolute file discovery for later read()/write(): ptc.find_files_abs(...)
Python helpers currently available in this session:
- read(path: str, *, offset: Optional[int] = None, limit: Optional[int] = None, symbol: Optional[str] = None, map: Optional[bool] = None) -> Union[str, ReadResult]
- grep(pattern: str, *, path: Optional[str] = None, glob: Optional[str] = None, ignoreCase: Optional[bool] = None, literal: Optional[bool] = None, context: Optional[Union[float, str]] = None, limit: Optional[Union[float, str]] = None, summary: Optional[bool] = None, scope: Optional[str] = None) -> Union[List[GrepMatch], GrepResult]
- find(pattern: str, *, path: Optional[str] = None, limit: Optional[float] = None) -> List[str]
- ls(*, path: Optional[str] = None, limit: Optional[float] = None) -> List[str]
- glob(pattern: str, *, path: Optional[str] = None, limit: Optional[float] = None) -> List[str]
- ptc.gather_limit(coros, limit=...) -> list
- ptc.read_many(paths, max_concurrency=..., offset=None, line_limit=None) -> list[str]
- ptc.read_tree(pattern=..., path='.', max_files=1000, concurrency=..., offset=None, line_limit=None) -> list[dict[str, Any]]
- ptc.find_files(pattern='**/*', path='.', max_files=1000) -> list[str]
- ptc.find_files_abs(pattern='**/*', path='.', max_files=1000) -> list[str]
- ptc.read_text(path, offset=None, limit=None) -> str
- await ptc.batch_tool(calls, max_concurrency=None, on_error=None) -> list[Any] | dict[str, Any]
-   - on_error='collect' returns a kind="batch_partial" envelope with per-call success/error entries instead of raising on first failure
- await ptc.first_success(calls, max_concurrency=None) -> Any
- await ptc.reduce_tool(calls, reducer, initial, max_concurrency=None) -> Any
- ptc.fit_output(value, max_chars=None, max_items=None, max_depth=None) -> dict[str, Any]
- ptc.expect_kind(value, kind) -> Any
- ptc.list_callable_tools() -> list[dict[str, Any]]
- ptc.get_tool_schema(name) -> dict[str, Any]
- ptc.extract_handles(value, kind=None) -> list[SupportedHandle]
- ptc.first_handle(value, kind=None) -> Optional[SupportedHandle]
- ptc.json_dump(value) -> str
- Use orchestration helpers for repeated multi-tool calls, ordered fallback logic, or bounded final-output shaping.
- Inspect ptc.list_callable_tools() before branching on optional tools; only the current callable session surface is guaranteed.
Prefer these for string content:
- ptc.read_text(path) always returns str (extracts raw text from structured results)
- ptc.read_many(paths) always returns list[str]
- ptc.read_tree(pattern) returns list[dict] where each entry["content"] is str
Use read(path) directly when you need structured anchored data (ReadResult with .lines[].anchor).
Callable tool set for this session: read, grep, find, ls, glob
Example:
entries = await ptc.read_tree(pattern="**/*.ts", path="src", max_files=1000, concurrency=6)
return {
  "files": len(entries),
  "sample_lengths": [len(entry["content"]) for entry in entries[:3]],
}