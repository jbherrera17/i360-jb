module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'change-me-in-production'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'change-me-salt'),
  },
});
