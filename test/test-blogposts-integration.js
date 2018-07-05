'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

//makes 'expect' syntax available
const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

const blogContent = "This is generic content to put into each post";

function seedBlogpostData(){
	console.info('seeding blogpost data');
	const seedData = [];

	for(let i=1; i<10; i++){
		seedData.push(generateBlogpostData());
	}
	//console.log(seedData);
	return BlogPost.insertMany(seedData);
}

function generateBlogpostData(){
	return {
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		},
		title: `This is the title - `,
		content: faker.lorem.paragraph()
	}
}

function tearDownDb(){
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}

describe('Blogpost API Resource', function(){

	before(function(){
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function(){
		return seedBlogpostData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function(){
		return closeServer();
	});


	describe('GET endpoint', function(){

		it('should return all existing blogposts', function(){

			let res;
			return chai.request(app)
			.get('/posts')
			.then(function(_res){

				res = _res;
				
				expect(res).to.have.status(200);
				//If status is not 200, the db seeding did not work
				

				expect(res.body).to.have.lengthOf.at.least(1);
				return BlogPost.count();
			})
			.then(function(count){
				expect(res.body).to.have.lengthOf(count);
			});
		});

		it('should return posts with right fields', function(){

			let resPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res){
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					//expect(res.body.blogPosts).to.be.a('array');
					res.body.forEach(function(blogpost){
						expect(blogpost).to.be.a('object');
					});
					resPost = res.body[0];
					return BlogPost.findById(resPost.id);

				})
				.then(function(blogpost){
					console.log(resPost.id);
					console.log(blogpost.id);
					expect(resPost.id).to.equal(blogpost.id);
				});
		});

	});

	describe('POST endpoint', function(){

		it('should add a new blog post', function(){
			const newBlogpost = generateBlogpostData();
			// {
   //      title: faker.lorem.sentence(),
   //      author: {
   //        firstName: faker.name.firstName(),
   //        lastName: faker.name.lastName(),
   //      },
   //      content: faker.lorem.text()
   //    };
			//console.log(newBlogpost);
			return chai.request(app)
				.post('/posts')
				.send(newBlogpost)
				.then(function(res){
					expect(res).to.have.status(201);
					expect(res).to.be.json;
					expect(res.body).to.be.a('object');
					expect(res.body).to.include.keys(
						'id','title','author','content','created');
					//console.log(res.body.author);
					expect(res.body.title).to.equal(newBlogpost.title);
					expect(res.body.content).to.equal(newBlogpost.content);
					expect(res.body.author).to.equal(
						`${newBlogpost.author.firstName} ${newBlogpost.author.lastName}`);
					expect(res.body.id).to.not.equal(null);
					return BlogPost.findById(res.body.id);
				})
				.then(function(post){
					// console.log(newBlogpost.body.title);
					// console.log(post.title);
					expect(post.id).to.not.equal(null);
					expect(post.title).to.equal(newBlogpost.title);
					expect(post.content).to.equal(newBlogpost.content);
					expect(post.author.firstName).to.equal(newBlogpost.author.firstName);
					expect(post.author.lastName).to.equal(newBlogpost.author.lastName);	
				});
		})

	});

	describe('PUT endpoint', function(){
		it('should update fields you provide', function(){
			const updateData = {
				title: "New Title that's cooler than before",
				content: "New content that's so cool omg"
			};

			return BlogPost
				.findOne()
				.then(function(blogpost){
					updateData.id = blogpost.id;
					console.log(updateData.id);
					//Make request then check to make sure it reflects data we sent
					return chai.request(app)
						.put(`/posts/${blogpost.id}`)
						.send(updateData);
				})
				.then(function(res){
					expect(res).to.have.status(204);

					return BlogPost.findById(updateData.id);
				})
				.then(function(blogpost){
					expect(blogpost.title).to.equal(updateData.title);
					expect(blogpost.content).to.equal(updateData.content);
				});
		});
	});

	describe('DELETE endpoint', function(){
		it('delete a blog post by id', function(){

			let doomedBlog;

			return BlogPost
				.findOne()
				.then(function(_post){
					doomedBlog = _post;
					return chai.request(app).delete(`/posts/${doomedBlog.id}`);
				})
				.then(function(res){
					expect(res).to.have.status(204);
					return BlogPost.findById(doomedBlog.id);
				})
				.then(function(_post){
					expect(_post).to.be.null;
				});
		});
	});
});
