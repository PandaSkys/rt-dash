# Image de la base RT-Dash (design § 13.1) : la même en local, en CI et en production.
# Postgres 17 officiel (Debian), épinglé par empreinte (L-05), avec pg_cron (archivage)
# et pgTAP + pg_prove (tests). Les paquets viennent du dépôt PGDG déjà configuré dans l'image.
FROM postgres:17.11-bookworm@sha256:665dc7b37ac52a17e298511414c21d23ffa4e6a6ef6225b3e5d59c7afb35e994

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    postgresql-17-cron \
    postgresql-17-pgtap \
    libtap-parser-sourcehandler-pgtap-perl \
  && rm -rf /var/lib/apt/lists/*

# pg_cron doit être chargé au démarrage ; ses tâches tournent dans la base de l'application.
RUN printf "\nshared_preload_libraries = 'pg_cron'\ncron.database_name = 'rtdash'\n" \
  >> /usr/share/postgresql/postgresql.conf.sample

COPY init/ /docker-entrypoint-initdb.d/

# Le conteneur tourne directement en utilisateur postgres, jamais en root. gosu (qui ne sert
# qu'à quitter root au démarrage) devient inutile ; il est retiré, avec ses failles connues
# (binaire Go ancien, signalé par Trivy).
RUN rm /usr/local/bin/gosu
USER postgres
