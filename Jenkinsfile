// File: Jenkinsfile
// Description: CI/CD pipeline with Docker build/push to DockerHub and Kubernetes deploy using Rancher kubeconfig

pipeline {
    agent any

    options { 
        timestamps()
    }

    environment {
        // DockerHub repo
        DOCKER_IMAGE_REPO = 'ksanthosh200/swe645-site:1.0'
        // Timestamp tag (e.g. 20251003173045)
        BUILD_TIMESTAMP   = "${new Date().format('yyyyMMddHHmmss')}"
    }

    stages {
        stage("Checkout Code") {
            steps {
                checkout scm
                sh 'echo "Building image with tag: ${BUILD_TIMESTAMP}"'
            }
        }

        stage("Docker Build & Push") {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-credentials', // Jenkins ID for DockerHub creds
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        set -euo pipefail

                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                        # Build & tag image
                        docker build -t ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} .
                        docker tag ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} ${DOCKER_IMAGE_REPO}:latest

                        # Push both tags
                        docker push ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP}
                        docker push ${DOCKER_IMAGE_REPO}:latest
                    '''
                }
            }
        }

        stage("Deploy to Kubernetes") {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        set -euo pipefail
                        export KUBECONFIG="$KUBECONFIG_FILE"

                        # Show current context
                        kubectl config current-context

                        # Update deployment with new image
                        kubectl set image deployment/deployment container-0=${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP} -n default

                        # Wait for rollout to finish
                        kubectl rollout status deployment/deployment -n default --timeout=180s
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
            echo "Pipeline finished."
        }
        success {
            echo "✅ Deployment Successful: ${DOCKER_IMAGE_REPO}:${BUILD_TIMESTAMP}"
        }
        failure {
            echo "❌ Deployment Failed. See logs above."
        }
    }
}
