// File: Jenkinsfile
// Description: CI/CD pipeline with Docker build/push, Kubernetes deploy, and post actions

pipeline {
    agent any

    options { timestamps() }

    environment {
        // Image coords (fixed tag; no build-time in tag)
        IMAGE_NAME = 'ksanthosh200/swe645-site'
        IMAGE_TAG  = '1.0'
    }

    stages {
        stage("Build Survey Image") {
            steps {
                script {
                    // Fetch the current SCM
                    checkout scm
                    sh 'echo "Building image: ${IMAGE_NAME}:${IMAGE_TAG}"'

                    // Secure Docker login + build (no insecure interpolation)
                    withCredentials([usernamePassword(
                        credentialsId: 'docker-credentials',     // <-- Jenkins credential (Docker Hub user + RW token)
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh '''
                          set -euo pipefail
                          docker logout || true
                          echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                          # Build the Docker image (fixed tag) and tag as latest
                          docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                          docker tag  ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
                        '''
                    }
                }
            }
        }

        stage("Push image to docker hub") {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                      set -euo pipefail
                      # Ensure we are logged in (token may not persist across stages)
                      echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                      # Push the Docker image (fixed tag) and latest
                      docker push ${IMAGE_NAME}:${IMAGE_TAG}
                      docker push ${IMAGE_NAME}:latest
                    '''
                }
            }
        }

        stage("Deploy to kubernetes") {
            steps {
                // Use kubeconfig secret file (e.g., your instance1.yaml uploaded as ID 'kubeconfig')
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                      set -euo pipefail
                      export KUBECONFIG="$KUBECONFIG_FILE"

                      # (Optional) Print current context/namespace for sanity
                      kubectl config current-context || true
                      NS="$(kubectl config view --minify -o jsonpath='{..namespace}' || true)"
                      if [ -z "$NS" ]; then NS=default; fi
                      echo "Using namespace: $NS"

                      # Update your existing Deployment/Container
                      # Adjust names if your deployment/container differ
                      kubectl set image deployment/deployment container-0=${IMAGE_NAME}:${IMAGE_TAG} -n "$NS"

                      # Wait for rollout to finish
                      kubectl rollout status deployment/deployment -n "$NS" --timeout=180s
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment Successful!'
        }
        failure {
            echo 'Deployment Failed.'
        }
        always {
            sh 'docker logout || true'
            echo 'Cleaning Up ...'
        }
    }
}
