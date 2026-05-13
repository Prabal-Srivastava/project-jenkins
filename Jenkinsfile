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
        timeout(time: 40, unit: 'MINUTES')
        disableConcurrentBuilds()
        // Aggressively keep only 2 builds to save disk space
        buildDiscarder(logRotator(numToKeepStr: '2'))
    }

    stages {
        stage('Prepare Environment') {
            steps {
                sh """
                    sudo mkdir -p ${DEPLOY_DIR}
                    sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
                    # Clean build cache before starting to free space
                    docker builder prune -f
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
                sh 'sudo cp $APP_ENV_FILE ' + "${DEPLOY_DIR}/.env"
                sh "cp docker-compose.yml ${DEPLOY_DIR}/docker-compose.yml"
                sh """
                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml pull
                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml up -d --remove-orphans
                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml ps
                """
            }
        }
    }

    post {
        always {
            // Aggressive cleanup: -a removes all images not used by running containers
            // This is vital for small disks (T2.micro/small)
            sh 'docker system prune -af'
            cleanWs()
        }
    }
}