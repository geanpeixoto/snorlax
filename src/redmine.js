'use strict';

const unirest = require('unirest');

class Redmine {

    host(host) {
        this._host = host;
        return this;
    }

    apiKey(apiKey) {
        this._apiKey = apiKey;
        return this;
    }

    getHeaders() {
        if (!this._apiKey)
            throw new Error('Impossível identificar o código de autenticação');

        return {
            'X-Redmine-API-Key': this._apiKey
        };
    }

    getIssue(id) {
        new Promise((resolve, reject) => {
            unirest.get(`${this._host}/issues/${id}.json?`)
                .headers(this.getHeaders())
                .type('json')
                .end(response => (response.status >= 200 && response.status < 300) ? resolve(response.body.issue) : reject(response));
        });
    }

    updateIssue(id, issue) {
        return new Promise((resolve, reject) => {
            unirest.put(`${this._host}/issues/${id}.json`)
                .headers(this.getHeaders())
                .type('json')
                .send({
                    issue
                })
                .end(response => (response.status >= 200 && response.status < 300) ? resolve(response.body) : reject(response));
        });
    }

    queryIssues(qs) {
        return new Promise((resolve, reject) => {
            unirest.get(`${this._host}/issues.json`)
                .headers(this.getHeaders())
                .type('json')
                .qs(qs)
                .end(response => (response.status >= 200 && response.status < 300) ? resolve(response.body.issues) : reject(response));
        });
    }

    queryTimeEntries(qs) {
        return new Promise((resolve, reject) => {
            unirest.get(`${this._host}/time_entries.json`)
                .headers(this.getHeaders())
                .type('json')
                .qs(qs)
                .end(response => (response.status >= 200 && response.status < 300) ? resolve(response.body.time_entries) : reject(response));
        });
    }

    createTimeEntry(time_entry) {
        return new Promise((resolve, reject) => {
            return unirest.post(`${this._host}/time_entries.json`)
                .headers(this.getHeaders())
                .type('json')
                .send({
                    time_entry
                })
                .end(response => (response.status >= 200 && response.status < 300) ? resolve(response.body) : reject(response));
        });
    }
}

module.exports = new Redmine();
