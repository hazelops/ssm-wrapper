const fs = require('fs');
const aws = require('aws-sdk');
const ssm = new aws.SSM({ apiVersion: '2014-11-06' });
const sleep = require('../utils/sleep').sleep;
const errResp = require('../utils/errors').errorResp;

exports.command = 'add';
exports.aliases = ['update'];
exports.describe = 'add or update parameters';
exports.builder = (yargs) => {
  yargs
    .example('$0 -f /path/to/parameters.json -p my-service -k alias/alias/kms-key-alias --fmt simple')
    .example('$0 -f /path/to/parameters.json -p my-service -k alias/alias/kms-key-alias -o true')
    .options({
      file: {
        alias: 'f',
        describe: 'JSON file with params to add.',
      },
      format: {
        alias: 'fmt',
        default: 'default',
        describe: 'JSON file format. Accepts `simple, default`.',
      },
      path: {
        alias: 'p',
        describe: 'The SSM path to add the parameters to.',
      },
      key: {
        alias: 'k',
        describe: 'The KMS key to encrypt the param with.',
      },
      overwrite: {
        alias: 'o',
        default: true,
        describe: 'Whether or not to overwrite the parameter.',
      },
    })
    .demandOption(['file', 'path', 'key'], 'You must define: file, path, and key.');
};
exports.handler = async (argv) => {
  await addUpdateParams(argv);
};


const addUpdateParams = async (yargs) => {
  if (yargs.format === 'default') {
    let awsParams = {};
    const params = JSON.parse(fs.readFileSync(yargs.file));
    //let awsParams = {};
    for (let i = 0; i < params.length; i++) {
      awsParams['Name'] = `/${yargs.path}/${params[i].key}`;
      awsParams['Value'] = params[i].value;
      awsParams['Type'] = params[i].type;
      awsParams['Overwrite'] = yargs.o;
      if (params[i].type === 'SecureString') {
        awsParams['KeyId'] = yargs.k;
      } else {
        delete awsParams['KeyId'];
      }
      ssm.putParameter(awsParams, (err, data) => {
        if (err) {
          errResp(err.code, err.stack, awsParams)
        } else {
          console.info(`Added: ${awsParams.Name}`)
        }
      })
      await sleep(1700)
    }
  }
  if (yargs.format === 'simple') {
    const params = JSON.parse(fs.readFileSync(yargs.file, 'utf8'));
    let awsParams = {};
    for(var key in params){
      let name = `/${yargs.path}/${key}`;
      awsParams['Name'] = name;
      awsParams['Value'] = params[key];
      awsParams['Type'] = 'SecureString';
      awsParams['Overwrite'] = yargs.o;
      awsParams['KeyId'] = yargs.k
      ssm.putParameter(awsParams, (err, data) => {
        if (err) {
          errResp(err.code, err.stack, awsParams)
        } else {
          console.info(`Added (Updated):`+ name)
        }
      })
      await sleep(1700)
    }
  }
  process.exit(0)
};
