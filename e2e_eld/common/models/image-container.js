'use strict';

module.exports = function(Imagecontainer) {

	// Imagecontainer.uploadFile = function (ctx,options,cb) {
	// 	console.log(ctx);
	// 	console.log(options);
	// 	console.log(cb);
	// 	cb("OK");
	// }


	// Imagecontainer.remoteMethod('uploadFile',
	// 	{
	// 		description: "upload an image a a user",
	// 	  accepts: [
	// 	      {arg: 'req', type: 'object', 'http': {source: 'req'}},
	// 	      {arg: 'res', type: 'object', 'http': {source: 'res'}}
		      
	// 	   ],
	// 	  http: { path: '/people/:id/image', verb: 'Post' },
	// 	  returns: { arg: 'data', type: 'Object' }
	// 	});

	// Imagecontainer.observe('after save', function(ctx, next) {
	//   console.log('FOOOOOOTO after');
	//   console.log(ctx.res.token.userId);
	//   next();
	// });

	// Imagecontainer.observe('before save', function(ctx, next) {
	//   console.log('FOOOOOOTO before');
	//   console.log(ctx.res.token.userId);
	//   next();
	// });

	// Imagecontainer.observe('loaded', function(ctx, next) {
	//   console.log('FOOOOOOTO loaded');
	//   console.log(ctx.res.token.userId);
	//   next();
	// });

	// Imagecontainer.observe('persist', function(ctx, next) {
	//   console.log('FOOOOOOTO persist');
	//   console.log(ctx.res.token.userId);
	//   next();
	// });

	// Imagecontainer.afterRemote('upload', function(ctx, next) {
	//   console.log('FOOOOOOTO upload');
	//   // console.log(ctx);
	//   // // console.log(ctx.res.token.userId);
	//   // next();
	// });

};
