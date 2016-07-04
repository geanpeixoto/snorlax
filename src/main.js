'use strict';

const defaults = require('../config.json');
const colors = require('colors');

const yargs = require('yargs')
    .usage('$0 [args]')
    .option('yes', {
      alias: 'y',
      describe: 'Não pergunta se deseja confirmar',
      default: false
    })
    .option('host', {
      describe: 'Endereço do redmine',
      default: defaults.host
    })
    .option('quiet', {
      alias: 'q',
      describe: 'Não exibe nenhuma mensagem',
      default: false
    })
    .option('user', {
      alias: 'u',
      describe: 'Código de usuário do redmine',
      default: defaults.user
    })
    .option('append', {
      alias: 'a',
      describe: 'Adiciona informações as de hoje'
    })
    .option('today', {
      alias: 't',
      describe: 'Informa o quer irá fazer no dia'
    })
    .option('api-key', {
      alias: 'k',
      describe: 'Código de autenticação do redmine',
      default: defaults['api-key']
    })
    .help('h')
    .argv;

const IMPEDIMENTS = 'Sem impedimentos';
const NOVA = 1;
const EM_ANDAMENTO = 2;
const MAX_BACKWARD = 7;
const REUNIAO_DIARIA = 'Reunião Diária';
const REUNIAO_DIARIA_REGEXP = new RegExp(REUNIAO_DIARIA, 'gi');
const TODAY = new Date().toISOString().substr(0, 10);

const redmine = require('./redmine')
  .host(yargs.host)
  .apiKey(yargs['api-key']);

const desculpas = [
  'Esperando atribuição de tarefas',
  'Refatorar código',
  'O mesmo que ontem',
  'Continuar o que estava fazendo ontem'
];

Promise.all([
  getCurrent(),
  getYesterdayTimes({user_id: yargs.user}),
  getTodayTasks({'assigned_to_id': yargs.user})
])
  .then(([reuniao, yesterdayTimes, todayIssues]) => {
    var today, yesterday = yesterdayTimes.map(time => `#${time.issue.id} - ${time.comments}`);

    if ( !yesterday.length )
      throw new Error('não existem horarios cadastrados para ontem');

    if ( yargs.today ) {
      today = [yargs.today];
    } else {
      today = todayIssues.map(issue => `#${issue.id} - ${issue.subject}`);
      if ( !today.length )
        today = shuffleArray(desculpas).slice(0, 1);
      if ( yargs.append )
        today.push(yargs.append);
    }

    var notes = `*Ontem*:\n${yesterday.join('\n')}\n\n*Hoje*:\n${today.join('\n')}\n\n*Impedimentos*:\n${IMPEDIMENTS}`;

    log(`${notes}`);

    return confirm().then(() => submit(reuniao, notes));
  })
  .then(response => log('\n\n--\n\n*** Salvo com sucesso! ***'))
  .catch(error => error && console.error(colors.red(`\n\nErro: ${error}\n`)));

function log(...args) {
  if ( !yargs.quiet )
    console.log.apply(console, args);
}

function confirm() {
  return new Promise((resolve, reject) => {
    if ( yargs.yes )
      return resolve();

    const input = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    input.question('\n\n--\n\nDeseja enviar (Y/n) ? ', function(response) {
      if ( ['', 'Y', 'y', 'yes', 'Yes'].indexOf(response) >= 0 )
        resolve();
      else
        reject();
      input.close();
    });
  });
}

function getTodayTasks(qs = {}) {
  return redmine.queryIssues(Object.assign({'status_id': EM_ANDAMENTO}, qs))
    .then(andamento => {
      if ( andamento.length > 0 )
        return shuffleArray(andamento).slice(0, 2);
      else
        return redmine.queryIssues(Object.assign({'status_id': NOVA}, qs))
          .then(nova => shuffleArray(nova).slice(0, 2));
    });
}

function getCurrent(qs = {}) {
  return redmine.queryIssues(Object.assign({
    'tracker_id': 6, // Gerênciamento
    'status_id': EM_ANDAMENTO,
    'created_on': `=${TODAY}`,
    'subject': REUNIAO_DIARIA_REGEXP,
  }, qs)).then(issues => {
    var length = issues.length;

    if (issues.length !== 1)
      throw `existem ${issues.length} reuniões abertas`;

    return issues[0];
  });
}

function getYesterdayTimes(qs = {}) {

  function recursion(return_in_days = 1) {
    if ( return_in_days > MAX_BACKWARD )
      throw new Error(`Não foi encontrado registro de horários nos ultimos ${MAX_BACKWARD} dias`);

    let day = new Date( Date.now() - return_in_days*24*1000*60*60 );
    return redmine.queryTimeEntries(Object.assign({'spent_on': `=${day.toISOString().substr(0, 10)}`}, qs))
      .then(times => times.filter(time => !REUNIAO_DIARIA_REGEXP.test(time.comments)))
      .then(times => !times.length ? recursion(return_in_days+1) : times );
  }

  return recursion();
}

function submit(issue, notes) {
  return Promise.all([
    redmine.updateIssue(issue.id, {notes}),
    redmine.createTimeEntry({
      'comments': REUNIAO_DIARIA,
      'hours': 0.25, // 0:15
      'activity_id': 12,
      'issue_id': issue.id,
      'spent_on': TODAY,
      'user_id': yargs.user
    })
  ]);
}

/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
