from celery import Celery

# Initialize Celery
# The first argument is the name of the current module, which is '__main__'.
# The broker argument specifies the URL of the message broker (Redis in this case).
# The backend argument specifies the result backend, also Redis.
celery_app = Celery(
    'gcp_data_sync',
    include=['gcp_data_sync.tasks']
)

# Configuration for local, synchronous execution without a broker
celery_app.conf.update(
    task_always_eager=True,      # Execute tasks locally and synchronously
    task_eager_propagates=True,  # Propagate exceptions from tasks
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)
