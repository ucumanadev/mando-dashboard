export type WikiLink = {
  name: string;
  url: string;
  note?: string;
};

export const WIKI_LINKS: WikiLink[] = [
  {
    name: "Note",
    url: "https://onedrive.live.com/personal/3ebbc3151dc712bf/_layouts/15/Doc.aspx?sourcedoc={aebab720-3945-4e8c-8b56-b0f5894ebdbc}&action=edit&wd=target%28Technical.one%7Cdffad2a0-8db2-4638-aaa2-a15533f4e422%2FGeneral%7Ca31c2e92-ad27-4589-ab68-e6c76792076d%2F%29&wdorigin=NavigationUrl",
    note: "Wiki"
  },
  { name: "Excalidraw", url: "https://excalidraw.com/", note: "Diagrams" }
];
