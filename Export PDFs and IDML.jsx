/* --------------------------------------
Export PDFs - Bleed + Spreads
by Aaron Troia (@atroia)
Modified Date: 11/9/23

Description: 
Multi-file Export allows you to export multiple PDFs with different 
InDesign export options, an IDML, and a JPG (for cover files) at the same time. 

Issues needing to be addressed:
- script runs even if you cancel it from Save Dialog

change log
v1.1 - added sig check function.
v1.2 - added bookline function—script throws errors if no Bookline layer is present in file.
v1.3 - added low resolution & second spread/bleed export. changed preset variables to be easier to read.
v1.4 - added page length to exclude certain functions from running on documents less than 3 pages.
v1.5 - added progress bar
v1.5.1 - InDesign file is now saved after exporting
v1.5.2 - added alert to check Barcode for CMYK
v1.5.3 - changed exportFile() to asynchronousExportFile(), now export progress shows up in Background Tasks and speed up export. 
v1.6 - Added image export for cover files and Signs. Added confirmation of Barcode check to kill the process if needed.
v1.6.1 - added try block to main() and spiral bound cover exception (2 pages). Simplified cover export if statement (lines 230-238).
v1.6.2 - updated sigcheck to not error when book has one 8 page signature.
-------------------------------------- */


var scptName = "Export PDFs"
var scptVersion = "v1.6.2"
var g = {};
var d = app.activeDocument;
var pageCount = d.pages.length;

// Presets & Export Settings
app.pdfExportPreferences.pageRange = PageRange.ALL_PAGES;
var bleed_preset         = app.pdfExportPresets.itemByName("PrePress (bleed)");
var spreads_preset       = app.pdfExportPresets.itemByName("Prepress (spreads)");
var bleed_spreads_preset = app.pdfExportPresets.itemByName("Prepress (bleed + spreads)");
var lowres_preset        = app.pdfExportPresets.itemByName("First Chapter");


main();


function main() {
  try {
    if (app.documents.length == 0) {
      alert("No documents are open.");
    } else {
      if (pageCount > 6) {
        sigCheck();
        bookline();
      } else if (pageCount < 6) {
        if (confirm("Check Barcode for CMYK.")){
          exportCover();
        } else {
          exit();
        }
      }
        exportPDF();
    }
  } catch (e) {
    alert(e.line);
  }
}


/* ======================== */
/* ====  Progress Bar  ==== */
/* ======================== */

function progressBar() {
  g.win = new Window('palette', scptName + " " + scptVersion);
  g.win.prg = g.win.add('progressbar');
  if (pageCount > 6){
    g.win.prg.maxvalue = 4;
  } else {
    g.win.prg.maxvalue = 2;
  }
  g.win.prg.value = 0;
  g.win.prg.size = [300, 20];
  g.win.btnClose = g.win.add('button', undefined, 'Cancel');
  g.win.btnClose.onClick = function (){
    g.win.close();
    exit();
  };
  g.win.show()
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
    var thePath = String(d.fullName).replace(/\..+$/, "") + ".pdf";
    thePath = String(new File(thePath).saveDlg());
    if (thePath == null) {
      alert ("You pressed Cancel!");
      exit();
    }
  } else {
    thePath = String(new File().saveDlg());
    if (thePath == null){
      alert ("You pressed Cancel!");
      exit();
    }
  }
  // TODO: rewrite so save is aborted when user cancels
  // https://stackoverflow.com/questions/30424895/indesign-check-if-cancel-button-is-clicked-on-a-dialog


    progressBar();
  // if(g.win.show() == true){
  //   progressBar();
  // }


  thePath = thePath.replace(/\.pdf$/, "");
  thePath2 = thePath.replace(/(\d+b|\.pdf$)/, "");
  // Here you can set the suffix at the end of the name
  FULL = thePath + ".pdf"; // Print PDF
  SPREADS = thePath2 + "_spreads.pdf"; // Spreads PDF
  LOW = thePath2 + "_low.pdf"; // Low resolution PDF
  IDML = thePath + ".idml"; // IDML file

    try {
      // export depending on document size
      if (pageCount > 3) {
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
      } else if (pageCount == 2 || pageCount == 3 || pageCount == 5) {
        // 3 page cover
        // SPREADS EXPORT
        // app.activeDocument.layers.item("Bookline").visible = true; // turn on Bookline for spreads export
        d.asynchronousExportFile(ExportFormat.PDF_TYPE, new File(FULL), false, bleed_spreads_preset);
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
  // var pageCount = d.pages.length;
  if (pageCount >= 32) {
    if (pageCount % 8 == 0) {
      sigMod = 8;
    } else if (pageCount % 8 !== 0){
      sigMod = 16;
    }
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
  var perfectBreak = pageCount + " pages. You're good.";
  var unperfectBreak =
    pageCount +
    " pages is not an even sig break.\nTry either add " +
    addPages +
    " pages or remove " +
    removePages +
    " pages.";
  if (pageCount % 8 == 0) {
    alert(perfectBreak);
  } else if (pageCount % sigMod !== 0) {
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


  if ((pageCount > 6 && pageCount <= 64) || pageCount == 1) {
    // for Signs
    app.jpegExportPreferences.pageString = "1"; // Page range, only VALID if EXPORT_RANGE used
  } else if (pageCount == 2 || pageCount == 3 || pageCount == 5) {
    // for book covers laid out as separate pages
    // app.jpegExportPreferences.pageString = "3"; // Page range, only VALID if EXPORT_RANGE used
    app.jpegExportPreferences.pageString = String(pageCount); // Page range, only VALID if EXPORT_RANGE used
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


/* ==================== */
/* ====  Bookline  ==== */
/* ==================== */

function bookline() {
  // Marc Autret's PageBorder 1.27 script
  try {
    if (d.layers.item("Bookline").isValid === true) {
      return;
    } else if (d.layers.item("Bookline").isValid === false) {
      // IF BOOKLINE DOESN'T EXISTS, CREATE LAYER
      var scriptName = "Bookline";
      var scriptVersion = "1.27";
      var layerName = scriptName;
      var alignStrings = ["Inside", "Outside", "Center"],
        ptBorder = ptBorder || 0.3, // default border weight (pts)
        pgMode = pgMode || 1, // -1=active page | 1=all pages
        align = align || 0, // default alignment index
        jDots = jDots || 0, // Japanese dots flag,
        jDotsStyleName = false,
        solidStyleName = false;
      function myColorAdd(myDocument, myColorName, myColorModel, myColorValue) {
        if (myColorValue instanceof Array == false) {
          myColorValue = [
            (parseInt(myColorValue, 16) >> 16) & 0xff,
            (parseInt(myColorValue, 16) >> 8) & 0xff,
            parseInt(myColorValue, 16) & 0xff,
          ];
          myColorSpace = ColorSpace.RGB;
        } else {
          if (myColorValue.length == 3) myColorSpace = ColorSpace.RGB;
          else myColorSpace = ColorSpace.CMYK;
        }
        try {
          myColor = myDocument.colors.item(myColorName);
          myName = myColor.name;
        } catch (myError) {
          myColor = myDocument.colors.add();
          myColor.properties = {
            name: myColorName,
            model: myColorModel,
            space: myColorSpace,
            colorValue: myColorValue,
          };
        }
        return myColor;
      }
      var createBorder = function (
        /*Layer*/ layer //------------------------------------------------ // this: Page [collective allowed]
      ) {
        //var myColor = myColorAdd(app.activeDocument, "Bookline", ColorModel.SPOT, [0,100,0,0]);
        var pages = this.getElements(),
          alignMode =
            StrokeAlignment[alignStrings[align].toLowerCase() + "Alignment"],
          pg;
        var recProps = {
          fillColor: "None",
          strokeColor: myColorAdd(
            app.activeDocument,
            "Bookline",
            ColorModel.SPOT,
            [0, 100, 0, 0]
          ),
          //strokeColor: 'Bookline',
          strokeTint: 100,
          strokeWeight: ptBorder,
          strokeAlignment: alignMode,
          strokeType: (jDots && jDotsStyleName) || solidStyleName,
          // [fix101125]
          textWrapPreferences:
            parseInt(app.version) > 5 // [fix101202]
              ? { textWrapMode: TextWrapModes.NONE }
              : { textWrapType: TextWrapTypes.NONE },
        };
        while ((pg = pages.pop())) {
          recProps.geometricBounds = pg.bounds;
          pg.rectangles.add(layer, undefined, undefined, recProps);
        }
      };
      var pageBorderMain =
        function () //------------------------------------------------
        {
          var doc = app.documents.length && app.activeDocument;
          if (!doc)
            throw Error(
              "Please open a document before running " + scriptName + "."
            );
          var vwPrefs = doc.viewPreferences,
            strokeUnits =
              "strokeMeasurementUnits" in vwPrefs
                ? vwPrefs.strokeMeasurementUnits
                : MeasurementUnits.points;
          jDotsStyleName = (function () {
            try {
              return doc.strokeStyles.itemByName("$ID/Japanese Dots").name;
            } catch (_) {}
            return false;
          })();
          solidStyleName = (function () {
            try {
              return doc.strokeStyles.itemByName("$ID/Solid").name;
            } catch (_) {}
            return false;
          })();
          if (!solidStyleName)
            throw Error("Unable to find the 'Solid' stroke style in InDesign!");
          var canRemove = (function () {
            var r = false;
            try {
              r = !!doc.layers.itemByName(layerName).id;
            } catch (_) {}
            return r;
          })();
          var dlgRet = (function () {
            var dlgTitle =
                " " +
                scriptName +
                " " +
                scriptVersion +
                "  |  \u00A9Indiscripts.com",
              d = app.dialogs.add({ name: dlgTitle, canCancel: true }),
              pn = d.dialogColumns.add().borderPanels.add(),
              dc = pn.dialogColumns.add(),
              dr = dc.dialogRows.add(),
              // Weight
              sWeight = dr.dialogColumns.add().staticTexts.add({
                staticLabel: "Weight:",
                minWidth: 80,
              }),
              meWeight = dr.dialogColumns.add().measurementEditboxes.add({
                editValue: ptBorder,
                editUnits: strokeUnits,
                minimumValue: 0.1,
                maximumValue: 5,
                smallNudge: 0.25,
                largeNudge: 0.1,
              }),
              // Alignment
              sAlign = (dr = dc.dialogRows.add()).dialogColumns
                .add()
                .staticTexts.add({
                  staticLabel: "Alignment:",
                  minWidth: 80,
                }),
              ddAlign = dr.dialogColumns.add().dropdowns.add({
                stringList: alignStrings,
                selectedIndex: align,
              }),
              // All Pages flag
              cbAllPages = (dc = pn.dialogColumns.add()).dialogRows
                .add()
                .dialogColumns.add()
                .checkboxControls.add({
                  staticLabel: "All Pages",
                  checkedState: pgMode == 1,
                }),
              // Dots flag
              cbDots = jDotsStyleName
                ? (dr = dc.dialogRows.add()).dialogColumns
                    .add()
                    .checkboxControls.add({
                      staticLabel: "Dotted Stroke",
                      checkedState: !!jDots,
                    })
                : { checkedState: false },
              // Remove
              cbRemove = canRemove
                ? d.dialogColumns.add().checkboxControls.add({
                    staticLabel: "Remove the border",
                    checkedState: false,
                  })
                : { checkedState: false };
            var ret = d.show() && {
              ptBorder: meWeight.editValue,
              align: ddAlign.selectedIndex,
              pgMode: cbAllPages.checkedState ? 1 : -1,
              jDots: !!cbDots.checkedState,
              removeBorder: cbRemove.checkedState,
            };
            d.destroy();
            return ret;
          })();
          if (!dlgRet) return false;
          ptBorder = dlgRet.ptBorder;
          pgMode = dlgRet.pgMode;
          align = dlgRet.align;
          jDots = dlgRet.jDots;
          // [fix100914]
          var activeLayer = (function () {
            var al = doc.activeLayer;
            return al.name == layerName
              ? doc.layers.length == 1 && doc.layers.add()
              : al.getElements()[0];
          })();
          // [/fix100914]
          var removeBorder = dlgRet.removeBorder;
          var borderLayer = (function () {
            var layers = doc.layers;
            try {
              layers.itemByName(layerName).remove();
            } catch (_) {}
            return removeBorder
              ? null
              : layers
                  .add({ name: layerName, printable: true })
                  .move(LocationOptions.atBeginning); // [fix100916]
          })();
          if (removeBorder) return;
          // [fix100914]
          var ro = vwPrefs.rulerOrigin;
          vwPrefs.rulerOrigin = RulerOrigin.spreadOrigin;
          // [/fix100914]
          // Main process
          createBorder.call(
            pgMode == 1 ? doc.pages.everyItem() : app.activeWindow.activePage,
            borderLayer
          );
          borderLayer.locked = true;
          // [fix100914]
          if (activeLayer) doc.activeLayer = activeLayer;
          vwPrefs.rulerOrigin = ro;
          // [/fix100914]
        };
      app.scriptPreferences.enableRedraw = false;
      try {
        pageBorderMain();
      } catch (e) {
        alert(e.line);
      }
      app.scriptPreferences.enableRedraw = true;
    }
  } catch (err) {
    alert(err.description);
  }
}
