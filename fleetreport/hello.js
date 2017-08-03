   let fs = require('fs'),
   PDFParser = require("pdf2json");
   var json2csv = require('json2csv');

   let pdfParser = new PDFParser();
  //  local
   var pdfPath = "/Users/nathanburk/projects/scripts/fleetreport/fleetcor3.pdf"
   var outputPath = "/Users/nathanburk/projects/scripts/fleetreport/Weekly Fuelman.csv"
  // shared rds2  mac
  //  var pdfPath = "/Volumes/Fuelman/fleetcor.pdf"
  //  var outputPath = "/Volumes/Fuelman/Weekly Fuelman.csv"
  // shared rds2  windows
  //  var pdfPath = "\\\\RDS2\\Fuelman\\fleetcor.pdf"
  //  var outputPath = "\\\\RDS2\\Fuelman\\Weekly Fuelman.csv"

   var   fuelmanMap = []

   pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
   pdfParser.on("pdfParser_dataReady", pdfData => {

      setEmptyFuelManData()
      fillFuelMap(pdfData.formImage.Pages[0])
      addDateAndBatchId(pdfData.formImage.Pages[0])
      writeToCSVFile()

   });

   pdfParser.loadPDF(pdfPath);

function fillFuelMap(pageData) {

  var nextId = 1;

  for (m = 0; m < fuelmanMap.length; m++) {
    for (d = 0; d < pageData.Texts.length; d++) {
      if(fuelmanMap[m]['Site ID'] == pageData.Texts[d].R[0].T) {
        if(m + 1 != fuelmanMap.length) {
          var endIndex = d
          var startIndex = d
          while (fuelmanMap[m + nextId]['Site ID'] != pageData.Texts[endIndex].R[0].T && pageData.Texts[endIndex].R[0].T != "Totals") {
              endIndex++;
          }
          if(pageData.Texts[endIndex].R[0].T != "Totals") {
            setSiteData(m, pageData.Texts, startIndex, endIndex)
            nextId = 1;
          } else { // number after doesn't exist
            d = -1;
            nextId++;
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
// (data[startIndex].R[0].T.includes("(") && !data[startIndex].R[0].T.includes(")")) ||
        if( data[startIndex].R[0].T.endsWith('.')) {
          data[startIndex].R[0].T = data[startIndex].R[0].T + data[startIndex + 1].R[0].T
          data[startIndex + 1].R[0].T = data[startIndex + 2].R[0].T.replace("%24", "")
        }
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
  // parenthesis checks incase one end gets chopped off into a different index upon extraction
    if(value.includes("(")) {
      if(!value.includes(")")) {
        return value.replace("(","($") + ")"
      } else {
      return value.replace("(","($")
      }
    } else if(value.includes(")")) {
      return '($' + value
    } else {
      return '$' + value
    }
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

function addDateAndBatchId(pageData) {
  var date = ""
  for (d = 0; d < pageData.Texts.length; d++) {
    if("through" == pageData.Texts[d].R[0].T) {
      date = pageData.Texts[d + 1].R[0].T.replace("%2F","/").replace("%2F","/")
      d = pageData.Texts.length
    }
  }

  for(i = 0; i < fuelmanMap.length; i++) {
    fuelmanMap[i]["Batch ID"] = date.substring("0","2") + date.substring("3","5") + "FM"
    fuelmanMap[i].Trx = date.replace("0","")
  }
}

function setEmptyFuelManData() {
    fuelmanMap = [
                      { 'Site ID': '681218',
                     'Site Name': 'Catharpin',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858901',
                     'Site Name': 'Battlefield BP',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '$0.0',
                     Fee: '$0.0',
                     Net: '$0.0' },
                   { 'Site ID': '858902',
                     'Site Name': 'EE Wine',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '$0.0',
                     Fee: '$0.0',
                     Net: '$0.0' },
                   { 'Site ID': '858903',
                     'Site Name': 'Rixlew',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858904',
                     'Site Name': 'Cedar Run',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858905',
                     'Site Name': 'Marshall',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858906',
                     'Site Name': 'Old Town',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858907',
                     'Site Name': 'Godwin',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858908',
                     'Site Name': 'Sudley',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858909',
                     'Site Name': 'Gateway',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858910',
                     'Site Name': 'Opal',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858911',
                     'Site Name': 'Bealeton',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858912',
                     'Site Name': 'Woodbine',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' },
                   { 'Site ID': '858913',
                     'Site Name': 'Pro Service',
                     'Batch ID': '0716FM',
                     Trx: '7/16/2017',
                     Gross: '',
                     Fee: '',
                     Net: '' }
                    ]
}
