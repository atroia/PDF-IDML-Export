/* --------------------------------------
Export PDFs + IDML
by Aaron Troia (@atroia)
Modified Date: 12/1/22

Description: 
Multi-file Export allows you to export multiple PDFs + IDML files with different 
InDesign export options and an IDML at the same time. No GUI.

updates
v1.1 - added sig check function.
v1.2 - added low resolution & second spread/bleed export. changed preset variables to be easier to read.
v1.3 - added page length to exclude certain functions from running on documents less than 3 pages.
v1.4 - added progress bar
-------------------------------------- */

var scptName = "Export PDFs"
var scptVersion = "v1.4"
var g = {};
var d = app.activeDocument;

// Presets & Export Settings
app.pdfExportPreferences.pageRange = PageRange.ALL_PAGES;
var bleed_preset = app.pdfExportPresets.itemByName("PrePress (bleed)");
var spreads_preset = app.pdfExportPresets.itemByName("Prepress (spreads)");
var bleed_spreads_preset = app.pdfExportPresets.itemByName("Prepress (bleed + spreads)");
var lowres_preset = app.pdfExportPresets.itemByName("First Chapter");

main();

function main() {
  if (app.documents.length == 0) {
    alert("No documents are open.");
  } else {
    if (d.pages.length > 3) {
      sigCheck();
    }
    exportPDF(progressBar());
  }
}

function progressBar() {
  g.win = new Window('palette', scptName + " " + scptVersion);
  g.win.prg = g.win.add('progressbar');
  if (d.pages.length > 3){
    g.win.prg.maxvalue = 4;
  } else {
    g.win.prg.maxvalue = 2;
  }
  g.win.prg.value = 0;
  g.win.prg.size = [300, 20];
  g.win.btnClose = g.win.add('button', undefined, 'Close');
  g.win.btnClose.onClick = function (){
    this.parent.close();
    g = null;
  }
  g.win.show();
}

function exportPDF() {
  if (!(bleed_preset.isValid &&
      spreads_preset.isValid &&
      bleed_spreads_preset.isValid &&
      lowres_preset.isValid
    )
  ) {
    alert(
      "One of the presets does not exist. Please check spelling carefully."
    );
    exit();
  }
  if (d.saved) {
    thePath = String(d.fullName).replace(/\..+$/, "") + ".pdf";
    thePath = String(new File(thePath).saveDlg());
  } else {
    thePath = String(new File().saveDlg());
  }

  thePath = thePath.replace(/\.pdf$/, "");
  thePath2 = thePath.replace(/(\d+b|\.pdf$)/, "");
  // Here you can set the suffix at the end of the name
  FULL = thePath + ".pdf"; // Print PDF
  SPREADS = thePath2 + "_spreads.pdf"; // Spreads PDF
  LOW = thePath2 + "_low.pdf"; // Low resolution PDF
  IDML = thePath + ".idml"; // IDML file

  try {
    // export depending on document size
    if (d.pages.length > 3) {
      // books
      // SINGLE PAGE EXPORT
      app.activeDocument.layers.item("Bookline").visible = false; // turn off Bookine layer (if it is visible) for single page export
      d.exportFile(ExportFormat.PDF_TYPE, new File(FULL), false, bleed_preset);
      g.win.prg.value++;
      // LOW RESOLUTION EXPORT
      d.exportFile(ExportFormat.PDF_TYPE, new File(LOW), false, lowres_preset);
      g.win.prg.value++;
      // SPREADS EXPORT
      app.activeDocument.layers.item("Bookline").visible = true; // turn on Bookline for spreads export
      d.exportFile(ExportFormat.PDF_TYPE, new File(SPREADS), false, spreads_preset);
      g.win.prg.value++;
      // IDML EXPORT
      d.exportFile(ExportFormat.INDESIGN_MARKUP, new File(IDML));
      g.win.prg.value++;
    } else if (d.pages.length == 3) {
      // 3 page cover
      // SPREADS EXPORT
      // app.activeDocument.layers.item("Bookline").visible = true; // turn on Bookline for spreads export
      d.exportFile(ExportFormat.PDF_TYPE, new File(SPREADS), false, bleed_spreads_preset);
      g.win.prg.value++;
      // IDML EXPORT
      d.exportFile(ExportFormat.INDESIGN_MARKUP, new File(IDML));
      g.win.prg.value++;
    } else {
      // 1 page cover
      // SINGLE PAGE EXPORT
      d.exportFile(ExportFormat.PDF_TYPE, new File(FULL), false, bleed_preset);
      g.win.prg.value++;
      // IDML EXPORT
      d.exportFile(ExportFormat.INDESIGN_MARKUP, new File(IDML));
      g.win.prg.value++;
    }
  } catch (errExport) {
    // alert('ERROR: The PDF file is either selected or open.');
    alert(errExport.description);
  }
}

// This function checks the page length to 16 page signatures for publishing
function sigCheck() {
  var sigMod = 0;
  var pageCount = d.pages.length;
  if (pageCount >= 32) {
    sigMod = 16;
  } else if (pageCount < 32 && pageCount > 3) {
    sigMod = 8;
  } else {
    alert(
      "There are no sigs, your document is only " + pageCount + " page(s)."
    );
    exit();
  }
  var addPages = (Math.ceil(pageCount / sigMod) * sigMod) - pageCount;
  var removePages = pageCount - (Math.floor(pageCount / sigMod) * sigMod);
  // var perfectBreak = pageCount + " pages. You're good.";
  var unperfectBreak =
    pageCount +
    " pages is not an even sig break.\nTry either " +
    addPages +
    " pages or " +
    removePages +
    " pages.";
  if (pageCount % sigMod !== 0) {
    alert(unperfectBreak);
  }
}
