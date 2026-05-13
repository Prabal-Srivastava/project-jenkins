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

        TMPDIR = "${WORKSPACE}/tmp"
        JAVA_OPTS = "-Djava.io.tmpdir=${WORKSPACE}/tmp"
        npm_config_cache = "${WORKSPACE}/.npm-cache"
    }

    options {
        timeout(time: 40, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '3'))
    }

    stages {

        stage('Prepare Environment') {
            steps {
                sh """
                    mkdir -p ${WORKSPACE}/tmp
                    docker builder prune -f || true
                    docker image prune -f || true

                    sudo mkdir -p ${DEPLOY_DIR}
                    sudo chown -R \$(whoami):\$(whoami) ${DEPLOY_DIR}
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
                    --build-arg NPM_CONFIG_CACHE=.npm \
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

                    sh """
                        echo "$PASS" | docker login -u "$USER" --password-stdin

                        docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                        docker push ${BACKEND_IMAGE}:latest

                        docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                        docker push ${FRONTEND_IMAGE}:latest
                    """
                }
            }
        }

        stage('Deploy') {
            steps {
                sh """
                    sudo cp ${APP_ENV_FILE} ${DEPLOY_DIR}/.env
                    cp docker-compose.yml ${DEPLOY_DIR}/docker-compose.yml
                """

                dir("${DEPLOY_DIR}") {
                    sh """
                        docker compose pull
                        docker compose up -d --remove-orphans

                        docker compose ps
                    """
                }
            }
        }
    }

    post {

        failure {
            dir("${DEPLOY_DIR}") {
                sh "docker compose logs --tail=100 || true"
            }
        }

        always {
            sh """
                docker image prune -f || true
                rm -rf ${WORKSPACE}/tmp
            """

            cleanWs()
        }
    }
}