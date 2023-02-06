/* --------------------------------------
Export PDFs + IDML
by Aaron Troia (@atroia)
Modified Date: 2/2/23

Description: 
Multi-file Export allows you to export multiple PDFs + IDML files with different 
InDesign export options and an IDML at the same time. No GUI.

Issues
- script runs even if you cancel it from Save Dialog

updates
v1.1 - added sig check function.
v1.2 - added bookline function—script throws errors if no Bookline layer is present in file.
v1.3 - added low resolution & second spread/bleed export. changed preset variables to be easier to read.
v1.4 - added page length to exclude certain functions from running on documents less than 3 pages.
v1.5 - added progress bar
v1.5.1 - InDesign file is now saved after exporting
v1.5.2 - added alert to check Barcode for CMYK
v1.5.3 - changed exportFile() to asynchronousExportFile(), now export progress shows up in Background Tasks. 
v1.6 - Added image export for cover files and Signs. Added confirmation of Barcode check to kill the process if needed.
-------------------------------------- */

var scptName = "Export PDFs"
var scptVersion = "v1.6"
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
    if (d.pages.length > 6) {
      sigCheck();
    } else if (d.pages.length < 6) {
      if (confirm("Check Barcode for CMYK.")){
        exportCover();
      } else {
        exit();
      }
    }
      exportPDF();
  }
}

/* ======================== */
/* ====  Progress Bar  ==== */
/* ======================== */

function progressBar() {
  g.win = new Window('palette', scptName + " " + scptVersion);
  g.win.prg = g.win.add('progressbar');
  if (d.pages.length > 6){
    g.win.prg.maxvalue = 4;
  } else {
    g.win.prg.maxvalue = 2;
  }
  g.win.prg.value = 0;
  g.win.prg.size = [300, 20];
  g.win.btnClose = g.win.add('button', undefined, 'Close');
  g.win.btnClose.onClick = function (){g.win.close()};
  g.win.show();
}

/* ======================== */
/* ====  PDF(s) Export ==== */
/* ======================== */

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
  
 progressBar();

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
      d.asynchronousExportFile(ExportFormat.PDF_TYPE, new File(FULL), false, bleed_preset);
      g.win.prg.value++;
      // LOW RESOLUTION EXPORT
      d.asynchronousExportFile(ExportFormat.PDF_TYPE, new File(LOW), false, lowres_preset);
      g.win.prg.value++;
      // SPREADS EXPORT
      app.activeDocument.layers.item("Bookline").visible = true; // turn on Bookline for spreads export
      d.asynchronousExportFile(ExportFormat.PDF_TYPE, new File(SPREADS), false, spreads_preset);
      g.win.prg.value++;
      // IDML EXPORT
      d.asynchronousExportFile(ExportFormat.INDESIGN_MARKUP, new File(IDML));
      g.win.prg.value++;
      d.save();
    } else if (d.pages.length == 3 || d.pages.length == 5) {
      // 3 or 5 page cover
      // SPREADS EXPORT
      // app.activeDocument.layers.item("Bookline").visible = true; // turn on Bookline for spreads export
      d.asynchronousExportFile(ExportFormat.PDF_TYPE, new File(SPREADS), false, bleed_spreads_preset);
      g.win.prg.value++;
      // IDML EXPORT
      d.asynchronousExportFile(ExportFormat.INDESIGN_MARKUP, new File(IDML));
      g.win.prg.value++;
      d.save();
    } else {
      // 1 page cover
      // SINGLE PAGE EXPORT
      d.asynchronousExportFile(ExportFormat.PDF_TYPE, new File(FULL), false, bleed_preset);
      g.win.prg.value++;
      // IDML EXPORT
      d.asynchronousExportFile(ExportFormat.INDESIGN_MARKUP, new File(IDML));
      g.win.prg.value++;
      d.save();
    }
  } catch (errExport) {
    // alert('ERROR: The PDF file is either selected or open.');
    alert(errExport.description);
  }
}

/* =========================== */
/* ====  Signature Check  ==== */
/* =========================== */

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

/* =============================*/
/* ====  Cover JPG Export  ==== */
/* =============================*/

function exportCover() {
  app.jpegExportPreferences.properties = {
   jpegRenderingStyle: JPEGOptionsFormat.BASELINE_ENCODING,
   jpegExportRange: ExportRangeOrAllPages.EXPORT_RANGE,
   jpegQuality: JPEGOptionsQuality.MAXIMUM,
   jpegColorSpace: JpegColorSpaceEnum.RGB,
   // exportingSpread: true, // Uncomment if spreads
   simulateOverprint: false,
   useDocumentBleeds: false,
   embedColorProfile: true,
   exportResolution: 300,
   antiAlias: true,
  }

  if (d.pages.length > 6 && d.pages.length <= 64 ) {
    // for Signs
    app.jpegExportPreferences.pageString = "1"; // Page range, only VALID if EXPORT_RANGE used
  } else if (d.pages.length == 3 || d.pages.length == 5) {
    // for book covers laid out as separate pages
    app.jpegExportPreferences.pageString = "3"; // Page range, only VALID if EXPORT_RANGE used
  } else if (d.pages.length == 1){
    // for book covers laid out as one page
    app.jpegExportPreferences.pageString = "1";
  } 

  if (d.saved) {
    thePath = String(d.fullName).replace(/\..+$/, "") + ".jpg";
    // thePath = String(d.fullName).replace(/\..+$/, "") + ".jpg";
    // thePath = String(new File(thePath).saveDlg()); // use this line if you want the save dialog to show
    thePath = String(new File(thePath));
  } else {
    // thePath = String((new File).saveDlg()); // use this line if you want the save dialog to show
    thePath = String(new File());
  } 

  thePath = thePath.replace(/\.jpg$/, ""); 
  // thePath2 = thePath.replace(/(\d+b|\.pdf$)/, ""); 
  name1 = thePath+".jpg"; 

  try {
    if (app.activeDocument.layers.item("Bookline").isValid == true){
      app.activeDocument.layers.item("Bookline").visible = false; // turn off Bookine layer (if it is visible) for single page export
      d.exportFile(ExportFormat.JPG, new File(name1), false);
      // alert("Your Cover Image has exported.");
    } else { // if no layer named "Bookline" exisits
      d.exportFile(ExportFormat.JPG, new File(name1), false);
      // alert("Your Cover Image has exported.");
    }
  } catch (errExport) {
    // alert('ERROR: The PDF file is either selected or open.');
    alert(errExport.line);
  }
}
