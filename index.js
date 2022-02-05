require('dotenv').config();
var fs = require('fs');
const util = require('util');
const readFile = (fileName) => util.promisify(fs.readFile)(fileName, 'utf8');
const writeFile = (fileName, content) => util.promisify(fs.writeFile)(fileName, content, 'utf8');
const appendFile = (fileName, content) => util.promisify(fs.appendFile)(fileName, content, 'utf8');
const xlsx = require('node-xlsx').default;

const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK(process.env.API_KEY, process.env.API_SEC);

const pinJsonToIPFS = async(body, options) => {
  var result = await pinata.pinJSONToIPFS(body, options);
  return result;
}

const pinFileToIPFS = async(filename) => {
  try {
    if (fs.existsSync('./'+process.env.PNG_DIR+'/'+filename+'.jpg')) {
      const readableStreamForFile = fs.createReadStream('./'+process.env.PNG_DIR+'/'+filename+'.jpg');
      var result = await pinata.pinFileToIPFS(readableStreamForFile, {})
      return result
    }
    return {
      IpfsHash: '',
      PinSize: 0,
      Timestamp: '',
      isDuplicate: true
    }
  } catch(err) {
    console.error(err)
    return {
      IpfsHash: '',
      PinSize: 0,
      Timestamp: '',
      isDuplicate: true
    }
  }
}

const convertXlsFile = async () => {
  const url_col = process.env.URL_COL;
  var workSheetsFromIFile = [];
  var iData = [];
  var oData = [];

  var links = [];
  if(fs.existsSync(process.env.CACHE)) {
    links = await readFile(process.env.CACHE, "utf-8");
    links = links.split("\n");
  }

  try {
    if (fs.existsSync(process.env.IFILE)) {
      workSheetsFromIFile = xlsx.parse(process.env.IFILE);
      if(workSheetsFromIFile[0] && workSheetsFromIFile[0]['data']) {
        iData = workSheetsFromIFile[0]['data']
      }
    }

    // =====================================================
    var index = 0;
    if(oData.length == 0) {
      oData[0] = iData[0];
    }
    if(oData[0][url_col] != 'url') {
      oData[0][url_col] = 'url';
    }

    var link_len = links.length;
    while (index < link_len && links[index] != '') {
      oData[index+1] = iData[index+1];
      oData[index+1][url_col] = links[index];
      index ++;
    }

    index ++;
    while(iData[index] && iData[index][0] !== null && iData[index][0] !== undefined) {
      var ret_pinata = await pinFileToIPFS(iData[index][0]);
      oData[index] = iData[index];
      oData[index][url_col] = ret_pinata.IpfsHash;
      if(index == 1) {
        await writeFile("links.txt", ret_pinata.IpfsHash, "utf-8");
      }
      else {
        await appendFile("links.txt", "\n", "utf-8");
        await appendFile("links.txt", ret_pinata.IpfsHash, "utf-8");
      }
      console.log(index);
      index ++;
    }

    var buffer = xlsx.build([{name: "Sheet 1", data: oData}]);
    fs.writeFile(process.env.OFILE, buffer,  "binary",function(err) { });
    // =====================================================


  } catch(err) {
    console.error(err)
  }
}

const uploadMissing = async () => {
  var workSheetsFromIFile = [];
  var iData = [];
  var oData = [];

  try {
    if (fs.existsSync("missed.xlsx")) {
      workSheetsFromIFile = xlsx.parse("missed.xlsx");
      if(workSheetsFromIFile[0] && workSheetsFromIFile[0]['data']) {
        iData = workSheetsFromIFile[0]['data']
      }
    }

    // =====================================================
    var index = 0;

    while(iData[index] && iData[index][0] !== null && iData[index][0] !== undefined) {
      var ret_pinata = await pinFileToIPFS(iData[index][0]);
      oData[index] = iData[index];
      oData[index][1] = ret_pinata.IpfsHash;
      console.log(index);
      index ++;
    }

    var buffer = xlsx.build([{name: "Sheet 1", data: oData}]);
    fs.writeFile(process.env.OFILE, buffer,  "binary",function(err) { });
    // =====================================================


  } catch(err) {
    console.error(err)
  }
}


const uploadMetadata = async () => {
  const url_col = process.env.URL_COL;
  var workSheetsFromIFile = [];

  try {
    if (fs.existsSync(process.env.oFILE)) {
      workSheetsFromIFile = xlsx.parse(process.env.oFILE);
      if(workSheetsFromIFile[0] && workSheetsFromIFile[0]['data']) {
        iData = workSheetsFromIFile[0]['data']
      }
    }

    // =====================================================
    var index = 1;

    while(iData[index] && iData[index][0] !== null && iData[index][0] !== undefined) {
      var tmp = [];
      for (var col=1; col<url_col; col++) {
        tmp.push({
          'attribute' : iData[0][col].toString().replace(/\s/g, ''),
          'value' : iData[index][col]
        });
      }
      var metadata = {
        'name' : 'ExoWorld',
        'tokenId' : iData[index][0],
        'description' : 'This is belong to ExoWorld Planet',
        'image' : 'https://gateway.pinata.cloud/ipfs/'+ iData[index][url_col],
        'attributes' : tmp
      }
      var ret = await pinJsonToIPFS(metadata, {});
      console.log(index, ret.IpfsHash);
      index ++;
    }
    // =====================================================


  } catch(err) {
    console.error(err)
  }
}


const test = async() => {
  // const tmp = await pinFileToIPFS(0);
  // console.log(tmp)
  // tmp.IpfsHash

  // await convertXlsFile();
  await uploadMissing();
  // await uploadMetadata();
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

test()

