import axios from 'axios';

// const apiPath = 'https://eld-test.azurewebsites.net/api';
const apiPath = 'https://e2e-eld-test.herokuapp.com/api';


// These are most of the API endpoints
// TODO: 1) check if the responses are ok
//        2) handle delete

// Example Usage: import api from '<path_to_file>/api'
// api.people.login(credentials).then(user => this.setState({user}));

export default {
  people: {
    login: credentials =>
      axios.post(`${apiPath}/People/login`, credentials, {headers:
        {'Access-Control-Allow-Origin': '*'}}),
    signup: (user, token) =>
      axios.post(`${apiPath}/People?access_token=${token}`, user),
    logout: token =>
      axios.post(`${apiPath}/People/logout?access_token=${token}`),
    getUsers: () =>
      axios.get(`${apiPath}/People`),
    exists: userId =>
      axios.get(`${apiPath}/People/${userId}/exists`),
    getUser: (userId, token) =>
      axios.get(`${apiPath}/People/${userId}?access_token=${token}`),
    updateUser: (userId, token, data) =>
      axios.patch(`${apiPath}/People/${userId}?access_token=${token}`, data),
    setImage: (userId, url) =>
      axios.put(`${apiPath}/People/${userId}/setImage`, url),
    deleteUser: (userId, token) =>
      axios.delete(`${apiPath}/People/${userId}?access_token=${token}`),
    verifyUser: userId =>
      axios.post(`${apiPath}/People/${userId}/verify`),
    confirm: (userId, token) =>
      axios.get(`${apiPath}/People/confirmation`, {userId, token}),
    changePassword: (oldPassword, newPassword) =>
      axios.post(`${apiPath}/People/change-password`,
        {oldPassword, newPassword}),
    reset: options =>
      axios.post(`${apiPath}/People/reset`, {options}),
    getUserEvents: (userId, token) =>
      axios.get(`${apiPath}/People/${userId}/events?access_token=${token}`),
    createUserEvents: (userId, eventData) =>
      axios.post(`${apiPath}/People/${userId}/events`, {eventData}),
    getUserMotorCarrier: userId =>
      axios.get(`${apiPath}/People/${userId}/motorCarrier`),
    getUserDutyStatusChange: (userId, token) =>
      axios.get(`${apiPath}/People/${userId}/dutyStatusChange?access_token=${token}`),
  },
  vehicles: {
    getVehicles: () =>
      axios.get(`${apiPath}/Vehicles`),
    getVehicle: (vehicleId, token) =>
      axios.get(`${apiPath}/Vehicles/${vehicleId}?access_token=${token}`),
    deleteVehicle: (vehicleId, token) =>
      axios.delete(`${apiPath}/Vehicles/${vehicleId}?access_token=${token}`),
    updateVehicle: (vehicleId, token, data) =>
      axios.patch(`${apiPath}/Vehicles/${vehicleId}?access_token=${token}`, data),
    setImage: (vehicleId, url) =>
      axios.get(`${apiPath}/Vehicles/${vehicleId}/setImage`, {url}),
    getVehicleMotorCarrier: vehicleId =>
      axios.get(`${apiPath}/Vehicles/${vehicleId}/motorCarrier`),
    exists: vehicleId =>
      axios.get(`${apiPath}/Vehicles/${vehicleId}/exists`),
    getTrackings: (vehicleId, token, conditions) =>
      axios.get(`${apiPath}/Vehicles/${vehicleId}/trackings?access_token=${token}`,
         {params: {filter: {where: conditions}}}),
  },
  motorCarriers: {
    getMotorCarriers: token =>
      axios.get(`${apiPath}/MotorCarriers?access_token=${token}`),
    getMotorCarrier: (motorCarrierId, token) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}?access_token=${token}`),
    createMotorCarrier: (motorCarrier, token) =>
      axios.post(`${apiPath}/MotorCarriers?access_token=${token}`, motorCarrier),
    updateMotorCarrier: (motorCarrierId, data, token) =>
      axios.patch(`${apiPath}/MotorCarriers/${motorCarrierId}?access_token=${token}`, data),
    getMotorCarrierPeople: (motorCarrierId, token, filters) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/people?access_token=${token}`,
        {params: {filter: filters}}),
    getMotorCarrierDrivers: (motorCarrierId, token) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/drivers?access_token=${token}`),
    getMotorCarrierPerson: (motorCarrierId, userId) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/people/userId/${userId}`),
    createMotorCarrierPeople: (motorCarrierId, token, user) =>
      axios.post(`${apiPath}/MotorCarriers/${motorCarrierId}/people?access_token=${token}`,
        user),
    countMotorCarrierPeople: motorCarrierId =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/people/count`),
    getMotorCarrierVehicles: (motorCarrierId, token) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/vehicles?access_token=${token}`),
    getMotorCarrierVehicle: (motorCarrierId, vehicleId) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/vehicles/${vehicleId}`),
    createMotorCarrierVehicle: (motorCarrierId, token, vehicle) =>
      axios.post(`${apiPath}/MotorCarriers/${motorCarrierId}/vehicles?access_token=${token}`,
        vehicle),
    countMotorCarrierVehicles: motorCarrierId =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/vehicles/count`),
    getMotorCarrierEvents: motorCarrierId =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/events`),
    getMotorCarrierEvent: (motorCarrierId, eventId) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/events/${eventId}`),
    countMotorCarrierEvents: motorCarrierId =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/events/count`),
    getTrackingsMotorCarrier: (motorCarrierId, token) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/tracking?access_token=${token}`),
    // axios.get(`http://private-5faa9-elde2e.apiary-mock.com/MotorCarriers/${motorCarrierId}/tracking`),
    countMotorCarrierSP: (motorCarrierId, token) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/people/count?access_token=${token}`
        {params: {where: {account_type: 'S'}}}),
    getDriverAlerts: (motorCarrierId, token, span) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/driverAlerts?access_token=${token}`,
        {params: {span: `${span}`}}),
    getDriversDutyStats: (motorCarrierId, token, span) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/driversDutyStats?access_token=${token}`,
        {params: {span: `${span}`}}),
    getDutyStats: (motorCarrierId, token, span) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/dutyStats?access_token=${token}`,
        {params: {span: `${span}`}}),
    getVehiclesDutyStats: (motorCarrierId, token, span) =>
      axios.get(`${apiPath}/MotorCarriers/${motorCarrierId}/vehiclesDutyStats?access_token=${token}`,
        {params: {span: `${span}`}}),
  },
  events: {
    getEvents: () =>
      axios.get(`${apiPath}/Events`),
    getEvent: eventId =>
      axios.get(`${apiPath}/Events/${eventId}`),
    getEventDriver: eventId =>
      axios.get(`${apiPath}/Events/${eventId}/driver`),
    getEventCodriver: eventId =>
      axios.get(`${apiPath}/Events/${eventId}/codriver`),
    getEventVehicle: eventId =>
      axios.get(`${apiPath}/Events/${eventId}/vehicle`),
    getEventMotorCarrier: eventId =>
      axios.get(`${apiPath}/Events/${eventId}/motorCarrier`),
  },
  images: {
    userImageLink: image => `${apiPath}/imageContainers/People/download/${image}`,
    vehicleImageLink: image => `${apiPath}/imageContainers/Vehicles/download/${image}`,
    driverImageUpload: (formData, config, token) =>
      axios.post(`${apiPath}/imageContainers/People/upload?access_token=${token}`,
        formData, config),
    vehicleImageUpload: (formData, config, token) =>
      axios.post(`${apiPath}/imageContainers/Vehicles/upload?access_token=${token}`,
        formData, config),
  },
  file: {
    csvFileUpload: (formData, config, token, id, type) =>
      axios.post(`${apiPath}/MotorCarriers/${id}/${type}/csvUpload?access_token=${token}`,
        formData, config),
    getfileUploads: filters => axios.get(`${apiPath}/file-uploads`,
      {params: {filter: filters}}),
    getFileUploadErrors: id => axios.get(`${apiPath}/file-uploads/${id}/errors`),
  },
};
