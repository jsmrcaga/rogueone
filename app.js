const fishingrod = require('fishingrod');
const fs = require('fs');
const queryString = require('querystring');
const chalk = require('chalk');
var config = JSON.parse(fs.readFileSync('./config.json'));

function getRescueStatus(hash, ship, cookie=config.cookie){
	var super_reg = /<script.+<\/script>/i;
	console.log('\t***************************');
	fishingrod.fish({
		https:true, 
		host: 'rogueone.disney.fr',
		path: '/rescue/' + hash,
		headers:{
			'Cookie': cookie,
			'X-Requested-With': 'XMLHttpRequest'
		},
		method:'GET'
	}, function(st, res){
		try{
			res = JSON.parse(res.replace(super_reg, ''));
		} catch(e) {
			return console.error('\tCould not get rescue status...', res);
		}
		if(res.data.rescue.status === 'fail'){
			console.log('CAPTURED LIKE SHIT');
			return friend_rescue(ship);
		} else {
			if(cookie == config.cookie){
				console.log('WON XP', res.data.rescue.xp_gain);
				getProfile();
			} else {
				console.log('RESCUED BY FRIEND');
			}
		}
	})
}

function rescue(hash, ship, number=0){
	// if we rescued more than 10 people
	if(number > 10){
		return;
	}

	fishingrod.fish({
		https: true, 
		host: 'rogueone.disney.fr',
		path: '/api.php',
		method: 'POST',
		headers: {
			'Cookie':  config.cookie,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		data: queryString.encode({
			task: 'breakCell',
			capture: hash
		})
	}, function(st, res){
		try{
			res = JSON.parse(res);
			if(res.error === 1){
				throw new Error();
			}
		} catch(e) {
			return console.error('Could not rescue '+hash, res);
		}
		console.log('\tGetting rescue status......');
		getRescueStatus(res.hash, ship);
	})
}

function getDestroyer(current_risk){
	var destroyers = ['sovereign', 'devastator', 'chimera', 'executrix'];
	var destroyer = destroyers[Math.floor(Math.random() * destroyers.length)];
	console.log(chalk.green('\tGetting Destroyer', destroyer));
	var super_reg = /<script.+<\/script>/i;
	fishingrod.fish({
		https: true,
		method: 'GET',
		host: 'rogueone.disney.fr',
		path: '/jail/' + destroyer,
		headers:{
			'Cookie': config.cookie,
			'Referer': `https://rogueone.disney.fr/jail/${destroyer}`,
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36',
			'X-Requested-With': 'XMLHttpRequest'
		}
	}, function(st, res){
		try{
			res = JSON.parse(res.replace(super_reg, ''));
		} catch(e) {
			return console.error('Could not parse destroyer response', res);
		}
		console.log('\tGot destroyer');
		console.log('\tGetting rescue....');

		res.data.prisoners.sort(function(a,b){
			return a.user.grade - b.user.grade;
		});
		for(p of res.data.prisoners){
			if(p.user.grade_id * 10 + current_risk > 60){
				continue;
			}
			console.log(`Trying rescue with risk ${p.user.grade_id * 10}% and total risk ${p.user.grade_id * 10 + current_risk}`);
			rescue(p.hash, destroyer);
		}
	});
}

function friend_rescue(ship, index=0){
	if(!config.friends[index]){
		return console.log('\tTried them all...');
	}

	var super_reg = /<script.+<\/script>/i;
	fishingrod.fish({
		https: true,
		method: 'GET',
		host: 'rogueone.disney.fr',
		path: '/jail/' + ship,
		headers:{
			'Cookie': config.friends[index],
			'Referer': `https://rogueone.disney.fr/jail/${ship}`,
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36',
			'X-Requested-With': 'XMLHttpRequest'
		}
	}, function(st, res){
		try{
			res = JSON.parse(res.replace(super_reg, ''));
		} catch(e) {
			return console.error('Could not parse destroyer response', res);
		}
		console.log(chalk.green(`\tGot destroyer ${ship} for rescue`));
		var allgood = false;
		for(p of res.data.prisoners){
			if(p.user.user_id === 275079){
				allgood = true;
				fishingrod.fish({
					https: true, 
					host: 'rogueone.disney.fr',
					path: '/api.php',
					method: 'POST',
					headers: {
						'Cookie':  config.friends[index],
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					data: queryString.encode({
						task: 'breakCell',
						capture: p.hash
					})
				}, function(st, res){
					try{
						res = JSON.parse(res);
						if(res.error === 1){
							throw new Error();
						}
					} catch(e) {
						console.error('\tCould not rescue with friend', res);
						return friend_rescue(ship, index+1);
					}
					console.log('\tGetting rescue status for myself......');
					getRescueStatus(p.hash, ship, config.friends[index]);
				});
			}
		}

		if(!allgood){
			console.log('No friend on ship');
			return friend_rescue(ship);
		}
	});
}

function getProfile(){
	console.log('\tGetting profile.......');
	fishingrod.fish({
		https:true, 
		host: 'rogueone.disney.fr',
		path:'/api.php?task=fetchCurrentUser',
		headers:{
			'Cookie': config.cookie
		}
	}, function(st, res){
		try{
			res = JSON.parse(res);
		} catch(e) {
			return console.error('Could not parse res', res);
		}
		if(parseInt(res.user.captured) === 1){
			return console.log('\tCaptured, waiting...');
		}
		console.log('\tGot profile!');
		console.log('\tGetting Destroyer.......');
		getDestroyer(res.user.risk);
	});
}

(function launch(){
	getProfile();
	setInterval(function(){
		getProfile();
	}, 1 * 60 * 1000);
})();