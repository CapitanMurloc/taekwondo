FROM python:3.11-rc
WORKDIR /app
VOLUME /app
EXPOSE 8050
COPY requeriments.txt requirements.txt
RUN pip install -r requirements.txt
COPY /src .
ENTRYPOINT ["python", "app.py"]
