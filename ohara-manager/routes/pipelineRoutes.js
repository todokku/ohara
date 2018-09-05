const axios = require('axios');

const { API_ROOT } = require('../constants/url');
const {
  onSuccess,
  onError,
  onValidateSuccess,
} = require('../utils/apiHelpers');

module.exports = app => {
  app.get('/api/pipelines', (req, res) => {
    axios
      .get(`${API_ROOT}/pipelines`)
      .then(result => onSuccess(res, result))
      .catch(err => onError(res, err));
  });

  app.get('/api/pipelines/:uuid', (req, res) => {
    axios
      .get(`${API_ROOT}/pipelines/${req.params.uuid}`)
      .then(result => onSuccess(res, result))
      .catch(err => onError(res, err));
  });

  app.post('/api/pipelines/create', (req, res) => {
    axios
      .post(`${API_ROOT}/pipelines`, req.body)
      .then(result => onSuccess(res, result))
      .catch(err => onError(res, err));
  });

  app.put('/api/pipelines/update/:uuid', (req, res) => {
    axios
      .put(`${API_ROOT}/pipelines/${req.params.uuid}`, req.body)
      .then(result => onSuccess(res, result))
      .catch(err => onError(res, err));
  });

  app.delete('/api/pipelines/delete/:uuid', (req, res) => {
    axios
      .delete(`${API_ROOT}/pipelines/${req.params.uuid}`)
      .then(result => onSuccess(res, result))
      .catch(err => onError(res, err));
  });

  app.put('/api/pipelines/validate/rdb', (req, res) => {
    axios
      .put(`${API_ROOT}/validate/rdb`, req.body)
      .then(result => onValidateSuccess(res, result))
      .catch(err => onError(res, err));
  });

  app.post('/api/pipelines/query/rdb', (req, res) => {
    axios
      .post(`${API_ROOT}/query/rdb`, req.body)
      .then(result => onSuccess(res, result))
      .catch(err => onError(res, err));
  });

  app.get('/api/sources/:uuid', (req, res) => {
    axios
      .get(`${API_ROOT}/sources/${req.params.uuid}`)
      .then(result => onSuccess(res, result))
      .catch(err => onError(res, err));
  });

  app.post('/api/sources/create', (req, res) => {
    axios
      .post(`${API_ROOT}/sources`, req.body)
      .then(result => onSuccess(res, result))
      .catch(err => onError(res, err));
  });

  app.put('/api/sources/update/:uuid', (req, res) => {
    axios
      .put(`${API_ROOT}/sources/${req.params.uuid}`, req.body)
      .then(result => onSuccess(res, result))
      .catch(err => onError(res, err));
  });

  return app;
};
