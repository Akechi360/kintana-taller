# Servidor Kintana (PocketBase) para hosting en contenedor (Render).
# El disco del plan gratis se borra al dormir: cada arranque crea la base y carga la demo.
FROM alpine:3.20

ARG PB_VERSION=0.40.5
ARG PB_SHA256=1dbea1b01eb3dfe64953513859d01e759c96650c4e3264fa4eecd54b769382e4

RUN apk add --no-cache ca-certificates unzip wget \
 && wget -q -O /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
 && echo "${PB_SHA256}  /tmp/pb.zip" | sha256sum -c - \
 && unzip -q /tmp/pb.zip pocketbase -d /pb \
 && rm /tmp/pb.zip

WORKDIR /pb
COPY server/pb_hooks ./pb_hooks
COPY server/pb_migrations ./pb_migrations
COPY server/pb_public ./pb_public
COPY server/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV PORT=8090
EXPOSE 8090
CMD ["./docker-entrypoint.sh"]
