const unirest = require('unirest');
const {api_key, host} = require('../config.json');
const headers = {
  'X-Redmine-API-Key': api_key
};

module.exports = {
  issues: {
    update: updateIssue,
    query: queryIssues,
    get: getIssue
  },
  times: {
    query: queryTimes,
    create: newTimeEntry
  }
}

function getIssue(id) {
  return new Promise((resolve, reject) => {
    unirest.get(`${host}/issues/${id}.json?`)
      .headers(headers)
      .type('json')
      .end(response => {
        if ( response.status >= 200 && response.status < 300 ) {
          resolve(response.body.issue);
        } else {
          reject(response);
        }
      });
    });
}

function updateIssue(id, data) {
  return new Promise((resolve, reject) => {
    unirest.put(`${host}/issues/${id}.json`)
      .headers(headers)
      .type('json')
      .send({issue: data})
      .end(response => {
        if ( response.status >= 200 && response.status < 300 ) {
          resolve(response.body);
        } else {
          reject(response);
        }
      });
  });
}

function queryIssues(qs) {
  return new Promise((resolve, reject) => {
    unirest.get(`${host}/issues.json`)
      .headers(headers)
      .type('json')
      .qs(qs)
      .end(response => {
        if ( response.status >= 200 && response.status < 300 ) {
          resolve(response.body.issues);
        } else {
          reject(response);
        }
      })
  });
}

function queryTimes(qs) {
  return new Promise((resolve, reject) => {
    unirest.get(`${host}/time_entries.json`)
      .headers(headers)
      .type('json')
      .qs(qs)
      .end(response => {
        if ( response.status >= 200 && response.status < 300 ) {
          resolve(response.body['time_entries']);
        } else {
          reject(response);
        }
      })
  });
}

function newTimeEntry(timeentry) {
  return new Promise((resolve, reject) => {
    return unirest.post(`${host}/time_entries.json`)
      .headers(headers)
      .type('json')
      .send({time_entry: timeentry})
      .end(response => {
        if ( response.status >= 200 && response.status < 300 ) {
          resolve(response.body);
        } else {
          reject(response);
        }
      })
  });
}
