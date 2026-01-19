import os
import pathlib

from flask import Flask


def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY="dev",
    )

    if test_config is None:
        app.config.from_pyfile("config.py", silent=True)
    else:
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        pathlib.Path(app.instance_path).mkdir(parents=True)
    except OSError:
        pass

    from . import routes

    app.register_blueprint(routes.bp)
    app.add_url_rule("/", endpoint="index")

    return app
