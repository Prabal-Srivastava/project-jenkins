pipeline {
    agent any

    environment {
        REGISTRY = "prabal2611"
        REGISTRY_CREDS = "docker-registry-credentials"

        BACKEND_IMAGE = "${REGISTRY}/book-saas-backend"
        FRONTEND_IMAGE = "${REGISTRY}/book-saas-frontend"

        IMAGE_TAG = "${BUILD_NUMBER}"

        // Use secret file credential
        APP_ENV_FILE = credentials('book-saas-env-file')
        DEPLOY_DIR = "/opt/book-saas"
    }

    options {
        timeout(time: 40, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '3'))
    }

    stages {
        stage('Prepare Environment') {
            steps {
                // Ensure the directory exists and the jenkins user can write to it
                sh """
                    sudo mkdir -p ${DEPLOY_DIR}
                    sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
                    docker builder prune -f || true
                """
            }
        }

        stage('Build Backend') {
            steps {
                sh "docker build --memory=512m -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest ./backend"
            }
        }

        stage('Build Frontend') {
            steps {
                sh "docker build --memory=800m -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest ./frontend"
            }
        }

        stage('Push Images') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${env.REGISTRY_CREDS}", usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                    sh 'echo "$PASS" | docker login -u "$USER" --password-stdin'
                    sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${BACKEND_IMAGE}:latest"
                    sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${FRONTEND_IMAGE}:latest"
                }
            }
        }

        stage('Deploy') {
            steps {
                // Using single quotes for APP_ENV_FILE to avoid the Groovy Interpolation warning
                sh 'sudo cp $APP_ENV_FILE ' + "${DEPLOY_DIR}/.env"
                sh "cp docker-compose.yml ${DEPLOY_DIR}/docker-compose.yml"
                
                // We run compose from HERE but point to the file in /opt
                sh """
                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml pull
                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml up -d --remove-orphans
                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml ps
                """
            }
        }
    }

    post {
        failure {
            // Check logs without changing directory to /opt
            sh "docker compose -f ${DEPLOY_DIR}/docker-compose.yml logs --tail=100 || true"
        }

        always {
            sh "docker image prune -f || true"
            cleanWs()
        }
    }
}