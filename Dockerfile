# Use a small, production-grade web server
FROM nginx:alpine

# Set working directory
WORKDIR /usr/share/nginx/html

# Remove the default index page
RUN rm -rf ./*

# Copy your static site into the Nginx web root
# (adjust paths if your files live in a subfolder)
COPY index.html ./
COPY survey.html ./
COPY error.html ./
COPY styles.css ./
COPY script.js ./
COPY course.jpg ./

# Optional: healthcheck so orchestrators know the container is healthy
# HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
#   CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

# Document the port Nginx listens on
EXPOSE 80

# Nginx default CMD is fine; nothing else needed
