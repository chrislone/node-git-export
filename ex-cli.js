#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const shell = require("shelljs");
const yargs = require("yargs");
const argv = yargs.alias('o', 'out')
                .alias('r', 'repo')
                .option('r', {
                  alias : 'repo',
                  demand: false,
                  // default: './',
                  describe: 'your git repo',
                  type: 'path string'
                })
                .option('o', {
                  alias : 'out',
                  demand: false,
                  // default: './',
                  describe: 'output path',
                  type: 'path string'
                })
                .option('l', {
                  alias : 'log',
                  demand: false,
                  default: 1,
                  describe: 'output path',
                  type: 'path string'
                })
                .usage('Usage: node ex-cli [options]')
                .example('node ex-cli -r=/your/git/repo/path -o=/path/you/want/to/output', '')
                .help('h')
                .alias('h', 'help')
                .epilog('copyright 2017')
                .argv;

const sepReg = /\/|\\|\\\\/g;

if (!shell.which('git')) {
  shell.echo('Sorry, this script requires git');
  shell.exit(1);
}

const date = new Date();
const month = ( date.getMonth() < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1) );
const theDate = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
const hours = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
const minutes = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
const seconds = date.getSeconds() < 10 ? "0"+date.getSeconds() : date.getSeconds();

const outPutDirName = "fix__" + date.getFullYear() + month + theDate + "_" + hours + "." + minutes + "." + seconds;

// 当前目录
const TOP = path.resolve(__dirname, ".");
//使用命令的 路径
const CALL_PATH = path.resolve(__dirname, ".");
//git 仓库地址
const GIT_REPO_PATH = argv.repo ? path.join(TOP, path.relative(TOP, argv.repo)) : CALL_PATH;

//导出路径
const OUTPUT_PATH = path.join(argv.out || CALL_PATH, outPutDirName);
//要导出的 git 文件的 log 数目
const LOGS = argv.log;

shell.cd(GIT_REPO_PATH);

const REPO_LOG = shell.exec(`git log -${LOGS} --name-status`,{silent:true});

if (REPO_LOG.code !== 0) {
  shell.echo('Error: Git status faile');
  shell.exit(1);
}

let logArr = REPO_LOG.replace(/\n\s*\r/g,"").replace(/\r|\n/g,',').split(",");
logArr = gitLogToArray(logArr);


//写文件
fs.exists(OUTPUT_PATH, function(exists){

  if(!exists){
    fs.mkdir(OUTPUT_PATH, 0777, function (err) {
      if (err) { throw err; }
    });
  }

  for(let parentvalue of logArr){
    let _inputDir = GIT_REPO_PATH;
    let _outPutPath = path.join( OUTPUT_PATH , path.sep );
    let _parentvalueArr = parentvalue.split(path.sep);
    for(let _childvalue of _parentvalueArr){

      _inputDir = path.join(_inputDir , _childvalue ).replace(sepReg,path.sep);
      _outPutPath = path.join(_outPutPath , _childvalue ).replace(sepReg,path.sep);

      //如果是文件，则使用 fileCopy 方法拷贝到指定目录
      if( fs.statSync(_inputDir).isFile() ){
        fileCopy(_inputDir, _outPutPath, function(){
          shell.echo( "Export: " + _outPutPath );
        });
      }

      //如果是路径，则创建路径
      if( fs.statSync(_inputDir).isDirectory() ){
        if( !fileExists(_outPutPath) ){
          fs.mkdirSync(_outPutPath,0777);
        }
      }

    }

  }
});



function gitLogToArray(log){
  let _tempArr = [];
  let _rex = /M\s+|R\s+|A\s+/;
  for(let v of log){
    if( _rex.test(v) ){
      if( v.indexOf("(") > -1 && v.indexOf(")") > -1 ){
        v = deleteContentInParentheses(v);
      }
      v = v.replace(/M\s+|R\s+|A\s+/,"").replace( sepReg, path.sep );
      _tempArr.push( v );
    }
  }
  return _tempArr;
}

/* 删除小括号中的内容并返回 */
function deleteContentInParentheses(str){
  let _s = "";
  let _start = str.indexOf("(");
  let _end = str.indexOf(")");
  return str.substr(0, _start-1)
}

function fileCopy(inputDir, OUTPUT_PATH, done) {
  var input = fs.createReadStream(inputDir);
  var output = fs.createWriteStream(OUTPUT_PATH);

  input.on('data', function(d) { output.write(d); });
  input.on('error', function(err) { throw err; });
  input.on('end', function() {
    output.end();
    done && done();
  });
}

function fileExists(filePath){
  try{
    fs.accessSync(filePath);
    return true;
  }catch(e){
    return false;
  }
}

