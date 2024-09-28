dev:
	docker-compose up -d

dev-build:
	docker-compose up -d --build

prod:
	docker-compose -f docker-compose.prod.yml up -d

prod-build:
	docker-compose -f docker-compose.prod.yml up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f
