#!/bin/sh
set -e
# Base nueva en cada arranque (disco efimero): migraciones + datos demo antes de servir,
# asi el primer visitante despues de despertar ya encuentra todo cargado.
if [ ! -f pb_data/data.db ]; then
  ./pocketbase migrate up
  ./pocketbase seed
fi
exec ./pocketbase serve --http="0.0.0.0:${PORT}"
