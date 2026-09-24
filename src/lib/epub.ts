import JSZip from "jszip";
import type { ProjectManifest } from "../types";
import { documentDescendants } from "./manifest";
import { renderMarkdown } from "./markdown";

/**
 * Builds a minimal, valid EPUB 2 file client-side — no server, no native
 * dependency. Good enough for e-readers (Kindle via "Send to Kindle",
 * Apple Books, Calibre) to open cleanly.
 */
export async function buildEpub(manifest: ProjectManifest, getContent: (id: string) => string): Promise<Blob> {
  const manuscriptRootId = manifest.rootIds.find((id) => id !== manifest.trashId);
  const chapterIds = manuscriptRootId ? documentDescendants(manifest, manuscriptRootId) : [];
  const zip = new JSZip();

  // @ts-ignore - Safely extract the custom metadata we added earlier
  const author = manifest.author as string | undefined;
  // @ts-ignore
  const dedication = manifest.dedication as string | undefined;

  // Must be the first entry, stored (uncompressed).
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 1. Generate a Title Page
  let titlePageHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(manifest.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body class="title-page">
  <h1 class="title">${escapeXml(manifest.title)}</h1>
  ${author ? `<p class="author">by ${escapeXml(author)}</p>` : ""}
  ${dedication ? `<p class="dedication">"${escapeXml(dedication)}"</p>` : ""}
</body>
</html>`;
  
  zip.file("OEBPS/title.xhtml", titlePageHtml);

  // 2. Generate Chapters
  const chapterFiles = chapterIds.map((id, i) => ({
    id,
    filename: `chapter-${i + 1}.xhtml`,
    title: manifest.nodes[id].title,
  }));

  for (const { id, filename, title } of chapterFiles) {
    const body = renderMarkdown(getContent(id));
    zip.file(
      `OEBPS/${filename}`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <h1>${escapeXml(title)}</h1>
  ${body}
</body>
</html>`
    );
  }

  // 3. Styling
  zip.file(
    "OEBPS/style.css",
    `body { font-family: Georgia, serif; line-height: 1.6; margin: 1.2em; }
h1 { font-size: 1.4em; margin-bottom: 1em; }
p { margin: 0 0 1em 0; text-indent: 1.4em; }
.title-page { text-align: center; margin-top: 20vh; }
.title-page .title { font-size: 2em; margin-bottom: 0.5em; }
.title-page .author { font-size: 1.2em; margin-bottom: 4em; }
.title-page .dedication { font-style: italic; }`
  );

  // 4. OPF Manifest (Includes the missing <dc:creator> tag)
  const uid = `urn:uuid:${manifest.id}`;
  const authorTag = author ? `<dc:creator xmlns:opf="http://www.idpf.org/2007/opf" opf:role="aut">${escapeXml(author)}</dc:creator>` : "";
  
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(manifest.title)}</dc:title>
    ${authorTag}
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">${uid}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    <item id="titlepage" href="title.xhtml" media-type="application/xhtml+xml"/>
    ${chapterFiles.map((c) => `<item id="${c.id}" href="${c.filename}" media-type="application/xhtml+xml"/>`).join("\n    ")}
  </manifest>
  <spine toc="ncx">
    <itemref idref="titlepage"/>
    ${chapterFiles.map((c) => `<itemref idref="${c.id}"/>`).join("\n    ")}
  </spine>
</package>`
  );

  // 5. Table of Contents
  zip.file(
    "OEBPS/toc.ncx",
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
  </head>
  <docTitle><text>${escapeXml(manifest.title)}</text></docTitle>
  <navMap>
    <navPoint id="np-title" playOrder="1">
      <navLabel><text>Title Page</text></navLabel>
      <content src="title.xhtml"/>
    </navPoint>
    ${chapterFiles
      .map(
        (c, i) => `<navPoint id="np-${c.id}" playOrder="${i + 2}">
      <navLabel><text>${escapeXml(c.title)}</text></navLabel>
      <content src="${c.filename}"/>
    </navPoint>`
      )
      .join("\n    ")}
  </navMap>
</ncx>`
  );

  return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}