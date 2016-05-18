const redmine = require('./redmine');


const {user_id, project_id} = require('../config.json');
const impediments = 'Sem impedimentos';
const nova = 1;
const em_andamento = 2;
const reuniao_diaria = 'Reunião Diária';
const TODAY = new Date().toISOString().substr(0, 10);
const YESTERDAY = new Date( Date.now() - 24*1000*60*60 ).toISOString().substr(0, 10);

const yargs = require('yargs')
  .usage('$0 [args]')
  .option('yes', {
    alias: 'y',
    describe: 'Não pergunta se deseja confirmar',
    default: false
  })
  .option('quiet', {
    alias: 'q',
    describe: 'Não exibe nenhuma mensagem',
    default: false
  })
  .option('append', {
    alias: 'a',
    describe: 'Adiciona informações as de hoje'
  })
  .option('today', {
    alias: 't',
    describe: 'Informa o quer irá fazer no dia'
  })
  .help('h')
  .argv;

const desculpas = [
  'Esperando atribuição de tarefas',
  'Refatorar código',
  'O mesmo que ontem',
  'Continuar o que estava fazendo ontem'
];

Promise.all([
  getCurrent({project_id}),
  getYesterdayTimes({user_id}),
  getTodayTasks({'assigned_to_id': user_id})
])
  .then(([reuniao, yesterdayTimes, todayIssues]) => {
    var today, yesterday = yesterdayTimes.map(time => `#${time.issue.id} - ${time.comments}`);

    if ( !yesterday.length )
      throw new Error('Não existem horarios cadastrados para ontem');

    if ( yargs.today ) {
      today = [yargs.today];
    } else {
      today = todayIssues.map(issue => `#${issue.id} - ${issue.subject}`);
      if ( !today.length )
        today = shuffleArray(desculpas).slice(0, 1);
      if ( yargs.append )
        today.push(yargs.append);
    }

    var notes = `*Ontem*:\n${yesterday.join('\n')}\n\n*Hoje*:\n${today.join('\n')}\n\n*Impedimentos*:\n${impediments}`;

    log(`${notes}`);

    return confirm().then(() => submit(reuniao, notes));
  })
  .then(response => {
    log('\n\nSalvo com sucesso!');
  })
  .catch(error => {
    error && console.error(error);
  });

function log(...args) {
  !yargs.quiet && console.log.apply(console, args)
}

function confirm() {
  return new Promise((resolve, reject) => {
    if ( yargs.yes )
      return resolve();

    const input = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    input.question('Deseja enviar (Y/n) ? ', function(response) {
      if ( ['', 'Y', 'y', 'yes', 'Yes'].indexOf(response) >= 0 )
        resolve();
      else
        reject();
      input.close();
    });
  });
}

function getTodayTasks(qs = {}) {
  return redmine.issues.query(Object.assign({'status_id': em_andamento}, qs))
    .then(andamento => {
      if ( andamento.length > 0 )
        return shuffleArray(andamento).slice(0, 2);
      else
        return redmine.issues.query(Object.assign({'status_id': nova}, qs))
          .then(nova => shuffleArray(nova).slice(0, 2));
    });
}

function getCurrent(qs = {}) {
  return redmine.issues.query(Object.assign({
    'tracker_id': 6, // Gerênciamento
    'status_id': em_andamento,
    'created_on': `=${TODAY}`,
    'subject': reuniao_diaria,
  }, qs)).then(issues => {
    var length = issues.length;

    if (issues.length !== 1)
      throw `Existem ${issues.length} reuniões abertas`

    return issues[0];
  });
}

function getYesterdayTimes(qs = {}) {
  return redmine.times.query(Object.assign({
    'spent_on': `=${YESTERDAY}`
  }, qs)).then(times => times.filter(time => time.comments !== reuniao_diaria));
}

function submit(issue, notes) {
  return Promise.all([
    redmine.issues.update(issue.id, {notes}),
    redmine.times.create({
      'comments': reuniao_diaria,
      'hours': 0.25, // 0:15
      'activity_id': 12,
      'issue_id': issue.id,
      'spent_on': TODAY,
      'user_id': user_id
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
