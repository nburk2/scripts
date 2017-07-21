   let fs = require('fs'),
   PDFParser = require("pdf2json");
   var json2csv = require('json2csv');

   let pdfParser = new PDFParser();
  //  local
  //  var pdfPath = "/Users/nathanburk/projects/fleetreportnode/fleetcor.pdf"
  //  var csvPath = "/Users/nathanburk/projects/fleetreportnode/test.csv"
  //  var outputPath = "/Users/nathanburk/projects/fleetreportnode/output.csv"
  // shared rds2
   var pdfPath = "/Volumes/Fuelman/fleetcor.pdf"
   var csvPath = "/Volumes/Fuelman/test.csv"
   var outputPath = "/Volumes/Fuelman/output.csv"

   var   fuelmanMap = []

   pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
   pdfParser.on("pdfParser_dataReady", pdfData => {
     getCSVFile(function(){
       fillFuelMap(pdfData.formImage.Pages[0])
       writeToCSVFile()
     })

       fs.writeFile("tests.json", JSON.stringify(pdfData.formImage.Pages[0]));
   });

   pdfParser.loadPDF(pdfPath);

function fillFuelMap(pageData) {

  for (m = 0; m < fuelmanMap.length; m++) {
    for (d = 0; d < pageData.Texts.length; d++) {
      if(fuelmanMap[m]['Site ID'] == pageData.Texts[d].R[0].T) {
        if(m + 1 != fuelmanMap.length) {
          var endIndex = d
          var startIndex = d
          while (fuelmanMap[m + 1]['Site ID'] != pageData.Texts[endIndex].R[0].T && pageData.Texts[endIndex].R[0].T != "Totals") {
              endIndex++;
          }
          if(pageData.Texts[endIndex].R[0].T != "Totals") { // number after doesn't exist
            setSiteData(m, pageData.Texts, startIndex, endIndex)
          }
        } else {
          // last site
          var endIndex = d
          var startIndex = d
          while ("Totals" != pageData.Texts[endIndex].R[0].T) {
              endIndex++;
          }
          setSiteData(m, pageData.Texts, startIndex, endIndex)
        }
      }
    }
  }
}

function setSiteData(currentSiteIndex, data, startIndex, endIndex ) {
    var valueIndexes = []
    while (startIndex <= endIndex) {
      if(data[startIndex].R[0].T.includes("%24") ) {
        data[startIndex].R[0].T = data[startIndex].R[0].T.replace("%24", "")
        data[startIndex].R[0].T = data[startIndex].R[0].T.replace("%2C", "")
        valueIndexes.push(startIndex);
      }
      startIndex ++;
    }

    if(valueIndexes.length == 4) {
      fuelmanMap[currentSiteIndex].Gross = addMoneySign((parseFloat(data[valueIndexes[0]].R[0].T) + parseFloat(data[valueIndexes[1]].R[0].T)).toString())//plus amount 1
      fuelmanMap[currentSiteIndex].Fee = addMoneySign(data[valueIndexes[2]].R[0].T)
      fuelmanMap[currentSiteIndex].Net = addMoneySign(data[valueIndexes[3]].R[0].T)
    } else if(valueIndexes.length == 3) {
      if(data[valueIndexes[1] + 1].R[0].T.includes(".")) {
        fuelmanMap[currentSiteIndex].Gross = addMoneySign(data[valueIndexes[0]].R[0].T)
        fuelmanMap[currentSiteIndex].Fee = addMoneySign(data[valueIndexes[1]].R[0].T)
        fuelmanMap[currentSiteIndex].Net = addMoneySign(data[valueIndexes[2]].R[0].T)
      } else {
        fuelmanMap[currentSiteIndex].Gross = addMoneySign((parseInt(data[valueIndexes[0]].R[0].T) + parseInt(data[valueIndexes[1]].R[0].T)).toString())//plus amount 1
        // fuelmanMap[currentSiteIndex].Fee = addMoneySign(data[valueIndexes[1]].R[0].T)
        fuelmanMap[currentSiteIndex].Net = addMoneySign(data[valueIndexes[2]].R[0].T)
      }
    } else if (valueIndexes.length == 2) {
      if(data[valueIndexes[0] + 1].R[0].T.includes(".")) {
        fuelmanMap[currentSiteIndex].Gross = '$0.0'
        fuelmanMap[currentSiteIndex].Fee = addMoneySign(data[valueIndexes[0]].R[0].T)
        fuelmanMap[currentSiteIndex].Net = addMoneySign(data[valueIndexes[1]].R[0].T)
      } else {
        fuelmanMap[currentSiteIndex].Gross = addMoneySign(data[valueIndexes[0]].R[0].T)
        fuelmanMap[currentSiteIndex].Fee = '$0.0'
        fuelmanMap[currentSiteIndex].Net = addMoneySign(data[valueIndexes[1]].R[0].T)
      }
    } else {
      fuelmanMap[currentSiteIndex].Gross = '$0.0'
      fuelmanMap[currentSiteIndex].Fee = '$0.0'
      fuelmanMap[currentSiteIndex].Net = '$0.0'
    }
}

function addMoneySign(value) {
    if(value.includes("(")) {
      return value.replace("(","($")
    } else {
      return '$' + value
    }
}

function getCSVFile(callback) {
    const csvFilePath=csvPath
    console.log("inside get csvfile")
    const csv=require('csvtojson')
    csv()
    .fromFile(csvFilePath)
    .on('json',(jsonObj)=>{
      fuelmanMap.push(jsonObj)
      console.log("obj: " + jsonObj)
      // setNewFuelMap()
        // combine csv header row and csv line to a json object
        // jsonObj.a ==> 1 or 4
    })
    .on('done',(error)=>{
        callback()
        console.log('end')
    })
}

function writeToCSVFile() {
    var json2csv = require('json2csv');
    var fs = require('fs');
    var fields = ['Site ID', 'Site Name', 'Batch ID', 'Trx', 'Gross', 'Fee', 'Net'];

    var csv = json2csv({ data: fuelmanMap, fields: fields });

    fs.writeFile(outputPath, csv, function(err) {
    if (err) throw err;
    console.log('file saved');
    });
}
