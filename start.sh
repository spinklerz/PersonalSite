# start.sh
py4web run --host 0.0.0.0 --port ${PORT:-8000} --errorlog=:stdout -L 20 apps
