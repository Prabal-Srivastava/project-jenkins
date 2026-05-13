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
        // Keep only 2 builds to save metadata space
        buildDiscarder(logRotator(numToKeepStr: '2'))
    }

    stages {
        stage('Cleanup & Prepare') {
            steps {
                sh """
                    # Immediate cleanup of previous failed build layers
                    docker system prune -f
                    sudo mkdir -p ${DEPLOY_DIR}
                    sudo chown -R jenkins:jenkins ${DEPLOY_DIR}
                """
            }
        }

        stage('Build Backend') {
            steps {
                sh "docker build --no-cache --memory=512m -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest ./backend"
            }
        }

        stage('Build Frontend') {
            steps {
                sh "docker build --no-cache --memory=800m -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest ./frontend"
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${env.REGISTRY_CREDS}", usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                    sh 'echo "$PASS" | docker login -u "$USER" --password-stdin'
                    sh "docker push ${BACKEND_IMAGE}:latest"
                    sh "docker push ${FRONTEND_IMAGE}:latest"
                    // Push tagged versions if needed for history
                    sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                }
            }
        }

        stage('Deploy') {
            steps {
                sh 'sudo cp $APP_ENV_FILE ' + "${DEPLOY_DIR}/.env"
                sh "cp docker-compose.yml ${DEPLOY_DIR}/docker-compose.yml"
                sh """
                    # Pull images first to ensure they are available
                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml pull
                    # Restart services
                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml up -d --remove-orphans
                    # Verify status
                    docker compose -f ${DEPLOY_DIR}/docker-compose.yml ps
                """
            }
        }
    }

    post {
        always {
            // THE CRITICAL STEP: 
            // -a removes all unused images (essential for small disks)
            sh 'docker system prune -af'
            cleanWs()
        }
        failure {
            // Check logs if deployment failed
            sh "docker compose -f ${DEPLOY_DIR}/docker-compose.yml logs --tail=50"
        }
    }
}