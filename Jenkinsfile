pipeline {
    agent any

    environment {
        REGISTRY = "prabal2611"
        REGISTRY_CREDS = "docker-registry-credentials"

        BACKEND_IMAGE = "${REGISTRY}/book-saas-backend"
        FRONTEND_IMAGE = "${REGISTRY}/book-saas-frontend"

        IMAGE_TAG = "${BUILD_NUMBER}"

        APP_ENV_FILE = credentials('book-saas-env-file')

        DEPLOY_DIR = "/opt/book-saas"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '2'))
    }

    stages {

        stage('Pre Cleanup') {
            steps {
                sh """
                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml down || true

                    docker system prune -af --volumes || true

                    docker builder prune -af || true

                    sudo mkdir -p ${DEPLOY_DIR}

                    sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
                """
            }
        }

        stage('Build Backend') {
            steps {
                sh """
                    docker build \
                    --memory=512m \
                    -t ${BACKEND_IMAGE}:${IMAGE_TAG} \
                    -t ${BACKEND_IMAGE}:latest \
                    ./backend
                """
            }
        }

        stage('Build Frontend') {
            steps {
                sh """
                    docker build \
                    --memory=800m \
                    -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                    -t ${FRONTEND_IMAGE}:latest \
                    ./frontend
                """
            }
        }

        stage('Push Images') {
            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: "${env.REGISTRY_CREDS}",
                        usernameVariable: 'USER',
                        passwordVariable: 'PASS'
                    )
                ]) {

                    sh '''
                        echo "$PASS" | docker login -u "$USER" --password-stdin
                    '''

                    sh "docker push ${BACKEND_IMAGE}:latest"
                    sh "docker push ${FRONTEND_IMAGE}:latest"

                    sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                }
            }
        }

        stage('Deploy') {
            steps {

                sh """
                    sudo cp ${APP_ENV_FILE} ${DEPLOY_DIR}/.env

                    cp docker-compose.yml ${DEPLOY_DIR}/docker-compose.yml

                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml pull

                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml up -d --remove-orphans

                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml ps
                """
            }
        }
    }

    post {

        always {

            sh '''
                docker image prune -af || true
                docker builder prune -af || true
            '''

            cleanWs()
        }

        failure {

            sh """
                docker compose -f ${DEPLOY_DIR}/docker-compose.yml logs --tail=100 || true
            """
        }
    }
}