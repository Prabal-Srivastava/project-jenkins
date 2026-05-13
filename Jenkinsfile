pipeline {
    agent any

    environment {
        REGISTRY        = "docker.io/p2511" 
        REGISTRY_CREDS  = 'docker-registry-credentials' 
        
        BACKEND_IMAGE   = "${REGISTRY}/book-saas-backend"
        FRONTEND_IMAGE  = "${REGISTRY}/book-saas-frontend"
        
        APP_ENV_FILE    = credentials('book-saas-env-file') 
        DEPLOY_DIR      = "/opt/book-saas"
        
        // REDIRECT TEMP SPACE: Tells Java and NPM to use your main disk instead of /tmp
        TMPDIR          = "${WORKSPACE}/tmp"
        JAVA_OPTS       = "-Djava.io.tmpdir=${WORKSPACE}/tmp"
        npm_config_cache = "${WORKSPACE}/.npm-cache"
    }

    options {
        timeout(time: 40, unit: 'MINUTES')
        disableConcurrentBuilds()
        // Keeps only the last 3 builds to save disk space
        buildDiscarder(logRotator(numToKeepStr: '3')) 
    }

    stages {
        stage('Emergency Cleanup') {
            steps {
                echo "Clearing space before starting..."
                // Create local temp dir
                sh "mkdir -p ${WORKSPACE}/tmp"
                // Remove any old containers or dangling layers that might be blocking the build
                sh "docker system prune -f"
                sh "sudo mkdir -p ${DEPLOY_DIR}"
                sh "sudo chown jenkins:jenkins ${DEPLOY_DIR}"
            }
        }

        stage('Build Backend') {
            steps {
                echo "Building Backend (Memory Restricted)..."
                // Limiting memory ensures the t3.micro doesn't freeze
                sh "docker build --memory=512m -t ${BACKEND_IMAGE}:latest ./backend"
            }
        }

        stage('Build Frontend') {
            steps {
                echo "Building Frontend (NPM Cache Redirected)..."
                // Using the environment variable set above to keep NPM out of /tmp
                sh "docker build --memory=800m -t ${FRONTEND_IMAGE}:latest ./frontend"
            }
        }

        stage('Push & Deploy') {
            steps {
                script {
                    // Docker Hub Login
                    withCredentials([usernamePassword(credentialsId: "${env.REGISTRY_CREDS}", passwordVariable: 'PASS', usernameVariable: 'USER')]) {
                        sh 'echo "$PASS" | docker login -u "$USER" --password-stdin'
                        sh "docker push ${BACKEND_IMAGE}:latest"
                        sh "docker push ${FRONTEND_IMAGE}:latest"
                    }

                    // Prepare Deployment Files
                    sh "sudo cp ${APP_ENV_FILE} ${DEPLOY_DIR}/.env"
                    sh "cp docker-compose.yml ${DEPLOY_DIR}/docker-compose.yml"
                    
                    dir(DEPLOY_DIR) {
                        sh "docker compose pull" 
                        sh "docker compose up -d --remove-orphans"
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Post-build cleanup to keep disk below threshold..."
            sh "docker image prune -f"
            // Deletes the temporary folder created in Workspace
            sh "rm -rf ${WORKSPACE}/tmp"
            cleanWs()
        }
    }
}