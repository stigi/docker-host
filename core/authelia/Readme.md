# Authelia

## Secrets

- `secrets/JWT_SECRET`: JWT secret, used during passwort reset
- `secrets/REDIS_PASSWORD`: Password of the redis instance
- `secrets/SESSION_SECRET`: Secret for session encryption
- `secrets/STORAGE_ENCRYPTION_KEY`: Secret for encrypting storage data
- `secrets/POSTGRES_PASSWORD`: Password for Postgresql instance used as storage
- `secrets/SMTP_PASSWORD`: SMTP Password, used together with the SMPT connection, configured in the `configuration.yml`
- `secrets/users_database.yml`: A simple user database, containing hashed passwords