var redmine = require('./redmine');
var {user_id} = require('../config.json');

const nova = 1;
const em_andamento = 2;
const reuniao_diaria = 'Reunião Diária';
const TODAY = new Date().toISOString().substr(0, 10);
const yesterday = new Date( Date.now() - 24*1000*60*60 ).toISOString().substr(0, 10);

const project_id = 45; // Spring 18

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
    var yesterday = yesterdayTimes.map(time => `#${time.issue.id} - ${time.comments}`);

    if ( !yesterday.length )
      throw new Error('Não existem horarios cadastrados para ontem');

    var today = todayIssues.map(issue => `#${issue.id} - ${issue.subject}`);

    if ( !today.length )
      today = shuffleArray(desculpas).slice(0, 1);

    return submit(reuniao, {
      yesterday: yesterday.join('\n'),
      today: today.join('\n')
    });
  })
  .then(() => {
    console.log('¯\\_(ツ)_/¯')
  })
  .catch(error => {
    console.error(error);
  });

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
    'spent_on': `=${yesterday}`
  }, qs)).then(times => times.filter(time => time.comments !== reuniao_diaria));
}

function submit(issue, {yesterday, today, impediments = 'Sem impedimentos'}) {
  var notes = `*Ontem*:\n${yesterday}\n\n*Hoje*:\n${today}\n\n*Impedimentos*:\n${impediments}`;

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
