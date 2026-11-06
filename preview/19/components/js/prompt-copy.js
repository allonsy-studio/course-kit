// assets/scripts/prompt-copy.js
var RESET_MS = 2e3;
var ICON = {
  copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>',
  done: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"></path></svg>'
};
for (const figure of document.querySelectorAll(".prompt[data-copyable]")) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "prompt-copy";
  button.title = "Copy this prompt";
  button.setAttribute("aria-label", "Copy this prompt");
  button.innerHTML = `<span data-icon="copy">${ICON.copy}</span><span data-icon="done" hidden>${ICON.done}</span>`;
  const icons = {
    copy: button.querySelector('[data-icon="copy"]'),
    done: button.querySelector('[data-icon="done"]')
  };
  const showIcon = (name) => {
    icons.copy.hidden = name !== "copy";
    icons.done.hidden = name !== "done";
  };
  const status = document.createElement("span");
  status.className = "sr-only";
  status.setAttribute("role", "status");
  let timer;
  button.addEventListener("click", async () => {
    const text = [...figure.querySelectorAll("p")].map((p) => p.textContent.trim()).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      showIcon("done");
      button.setAttribute("aria-label", "Prompt copied");
      status.textContent = "Prompt copied to the clipboard.";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(figure);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.setAttribute("aria-label", "Prompt selected \u2014 press your copy shortcut");
      status.textContent = "Prompt selected \u2014 press your copy shortcut.";
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      showIcon("copy");
      button.setAttribute("aria-label", "Copy this prompt");
      status.textContent = "";
    }, RESET_MS);
  });
  figure.append(button, status);
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNzZXRzL3NjcmlwdHMvcHJvbXB0LWNvcHkuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIENvcHkgY29udHJvbCBmb3IgYC5wcm9tcHRgIGZpZ3VyZXMgKGEgYGBgcHJvbXB0IGZlbmNlIGluIE1hcmtkb3duKS5cbi8vIEluamVjdGVkIGNsaWVudC1zaWRlLCBhbmQgb25seSBvbnRvIGBkYXRhLWNvcHlhYmxlYCBmaWd1cmVzIFx1MjAxNCB0aGVcbi8vIHByb2hpYml0ZWQgZXhhbXBsZXMgZ2V0IG5vIGNvcHkgY29udHJvbC5cbmNvbnN0IFJFU0VUX01TID0gMjAwMDtcblxuLy8gRWFjaCBpY29uIGlzIHdyYXBwZWQgaW4gYSA8c3Bhbj4gc28gYGhpZGRlbmAgYWxvbmUgY2FuIHN3aXRjaCB0aGVtIChbaGlkZGVuXVxuLy8gZG9lc24ndCBhcHBseSB0byBTVkcpLlxuY29uc3QgSUNPTiA9IHtcblx0Y29weTogJzxzdmcgd2lkdGg9XCIxNlwiIGhlaWdodD1cIjE2XCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiIHN0cm9rZS1saW5lY2FwPVwicm91bmRcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPjxyZWN0IHg9XCI5XCIgeT1cIjlcIiB3aWR0aD1cIjExXCIgaGVpZ2h0PVwiMTFcIiByeD1cIjJcIj48L3JlY3Q+PHBhdGggZD1cIk01IDE1VjVhMiAyIDAgMCAxIDItMmgxMFwiPjwvcGF0aD48L3N2Zz4nLFxuXHRkb25lOiAnPHN2ZyB3aWR0aD1cIjE2XCIgaGVpZ2h0PVwiMTZcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCIgc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PHBhdGggZD1cIk00IDEyLjUgOSAxNy41IDIwIDYuNVwiPjwvcGF0aD48L3N2Zz4nLFxufTtcblxuZm9yIChjb25zdCBmaWd1cmUgb2YgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5wcm9tcHRbZGF0YS1jb3B5YWJsZV1cIikpIHtcblx0Y29uc3QgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKTtcblx0YnV0dG9uLnR5cGUgPSBcImJ1dHRvblwiO1xuXHRidXR0b24uY2xhc3NOYW1lID0gXCJwcm9tcHQtY29weVwiO1xuXHRidXR0b24udGl0bGUgPSBcIkNvcHkgdGhpcyBwcm9tcHRcIjtcblx0YnV0dG9uLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJDb3B5IHRoaXMgcHJvbXB0XCIpO1xuXHRidXR0b24uaW5uZXJIVE1MID0gYDxzcGFuIGRhdGEtaWNvbj1cImNvcHlcIj4ke0lDT04uY29weX08L3NwYW4+PHNwYW4gZGF0YS1pY29uPVwiZG9uZVwiIGhpZGRlbj4ke0lDT04uZG9uZX08L3NwYW4+YDtcblx0Y29uc3QgaWNvbnMgPSB7XG5cdFx0Y29weTogYnV0dG9uLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWljb249XCJjb3B5XCJdJyksXG5cdFx0ZG9uZTogYnV0dG9uLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWljb249XCJkb25lXCJdJyksXG5cdH07XG5cdGNvbnN0IHNob3dJY29uID0gKG5hbWUpID0+IHtcblx0XHRpY29ucy5jb3B5LmhpZGRlbiA9IG5hbWUgIT09IFwiY29weVwiO1xuXHRcdGljb25zLmRvbmUuaGlkZGVuID0gbmFtZSAhPT0gXCJkb25lXCI7XG5cdH07XG5cblx0Ly8gVGhlIGxhYmVsIGNoYW5nZSBhbG9uZSBpc24ndCByZWxpYWJseSBhbm5vdW5jZWQsIHNvIG1pcnJvciBpdCBoZXJlLlxuXHRjb25zdCBzdGF0dXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcblx0c3RhdHVzLmNsYXNzTmFtZSA9IFwic3Itb25seVwiO1xuXHRzdGF0dXMuc2V0QXR0cmlidXRlKFwicm9sZVwiLCBcInN0YXR1c1wiKTtcblxuXHRsZXQgdGltZXI7XG5cdGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuXHRcdGNvbnN0IHRleHQgPSBbLi4uZmlndXJlLnF1ZXJ5U2VsZWN0b3JBbGwoXCJwXCIpXS5tYXAoKHApID0+IHAudGV4dENvbnRlbnQudHJpbSgpKS5qb2luKFwiXFxuXFxuXCIpO1xuXHRcdHRyeSB7XG5cdFx0XHRhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCh0ZXh0KTtcblx0XHRcdHNob3dJY29uKFwiZG9uZVwiKTtcblx0XHRcdGJ1dHRvbi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiUHJvbXB0IGNvcGllZFwiKTtcblx0XHRcdHN0YXR1cy50ZXh0Q29udGVudCA9IFwiUHJvbXB0IGNvcGllZCB0byB0aGUgY2xpcGJvYXJkLlwiO1xuXHRcdH0gY2F0Y2gge1xuXHRcdFx0Ly8gQ2xpcGJvYXJkIGRlbmllZCAob3IgYW4gaW5zZWN1cmUgY29udGV4dCk6IHNlbGVjdCB0aGUgdGV4dCBzbyB0aGVcblx0XHRcdC8vIGtleWJvYXJkIHNob3J0Y3V0IHN0aWxsIHdvcmtzLlxuXHRcdFx0Y29uc3QgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuXHRcdFx0cmFuZ2Uuc2VsZWN0Tm9kZUNvbnRlbnRzKGZpZ3VyZSk7XG5cdFx0XHRjb25zdCBzZWxlY3Rpb24gPSBnZXRTZWxlY3Rpb24oKTtcblx0XHRcdHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKTtcblx0XHRcdHNlbGVjdGlvbi5hZGRSYW5nZShyYW5nZSk7XG5cdFx0XHRidXR0b24uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBcIlByb21wdCBzZWxlY3RlZCBcdTIwMTQgcHJlc3MgeW91ciBjb3B5IHNob3J0Y3V0XCIpO1xuXHRcdFx0c3RhdHVzLnRleHRDb250ZW50ID0gXCJQcm9tcHQgc2VsZWN0ZWQgXHUyMDE0IHByZXNzIHlvdXIgY29weSBzaG9ydGN1dC5cIjtcblx0XHR9XG5cdFx0Y2xlYXJUaW1lb3V0KHRpbWVyKTtcblx0XHR0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0c2hvd0ljb24oXCJjb3B5XCIpO1xuXHRcdFx0YnV0dG9uLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJDb3B5IHRoaXMgcHJvbXB0XCIpO1xuXHRcdFx0c3RhdHVzLnRleHRDb250ZW50ID0gXCJcIjtcblx0XHR9LCBSRVNFVF9NUyk7XG5cdH0pO1xuXG5cdGZpZ3VyZS5hcHBlbmQoYnV0dG9uLCBzdGF0dXMpO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUdBLElBQU0sV0FBVztBQUlqQixJQUFNLE9BQU87QUFBQSxFQUNaLE1BQU07QUFBQSxFQUNOLE1BQU07QUFDUDtBQUVBLFdBQVcsVUFBVSxTQUFTLGlCQUFpQix3QkFBd0IsR0FBRztBQUN6RSxRQUFNLFNBQVMsU0FBUyxjQUFjLFFBQVE7QUFDOUMsU0FBTyxPQUFPO0FBQ2QsU0FBTyxZQUFZO0FBQ25CLFNBQU8sUUFBUTtBQUNmLFNBQU8sYUFBYSxjQUFjLGtCQUFrQjtBQUNwRCxTQUFPLFlBQVksMEJBQTBCLEtBQUssSUFBSSx3Q0FBd0MsS0FBSyxJQUFJO0FBQ3ZHLFFBQU0sUUFBUTtBQUFBLElBQ2IsTUFBTSxPQUFPLGNBQWMsb0JBQW9CO0FBQUEsSUFDL0MsTUFBTSxPQUFPLGNBQWMsb0JBQW9CO0FBQUEsRUFDaEQ7QUFDQSxRQUFNLFdBQVcsQ0FBQyxTQUFTO0FBQzFCLFVBQU0sS0FBSyxTQUFTLFNBQVM7QUFDN0IsVUFBTSxLQUFLLFNBQVMsU0FBUztBQUFBLEVBQzlCO0FBR0EsUUFBTSxTQUFTLFNBQVMsY0FBYyxNQUFNO0FBQzVDLFNBQU8sWUFBWTtBQUNuQixTQUFPLGFBQWEsUUFBUSxRQUFRO0FBRXBDLE1BQUk7QUFDSixTQUFPLGlCQUFpQixTQUFTLFlBQVk7QUFDNUMsVUFBTSxPQUFPLENBQUMsR0FBRyxPQUFPLGlCQUFpQixHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLFlBQVksS0FBSyxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQzNGLFFBQUk7QUFDSCxZQUFNLFVBQVUsVUFBVSxVQUFVLElBQUk7QUFDeEMsZUFBUyxNQUFNO0FBQ2YsYUFBTyxhQUFhLGNBQWMsZUFBZTtBQUNqRCxhQUFPLGNBQWM7QUFBQSxJQUN0QixRQUFRO0FBR1AsWUFBTSxRQUFRLFNBQVMsWUFBWTtBQUNuQyxZQUFNLG1CQUFtQixNQUFNO0FBQy9CLFlBQU0sWUFBWSxhQUFhO0FBQy9CLGdCQUFVLGdCQUFnQjtBQUMxQixnQkFBVSxTQUFTLEtBQUs7QUFDeEIsYUFBTyxhQUFhLGNBQWMsaURBQTRDO0FBQzlFLGFBQU8sY0FBYztBQUFBLElBQ3RCO0FBQ0EsaUJBQWEsS0FBSztBQUNsQixZQUFRLFdBQVcsTUFBTTtBQUN4QixlQUFTLE1BQU07QUFDZixhQUFPLGFBQWEsY0FBYyxrQkFBa0I7QUFDcEQsYUFBTyxjQUFjO0FBQUEsSUFDdEIsR0FBRyxRQUFRO0FBQUEsRUFDWixDQUFDO0FBRUQsU0FBTyxPQUFPLFFBQVEsTUFBTTtBQUM3QjsiLAogICJuYW1lcyI6IFtdCn0K
