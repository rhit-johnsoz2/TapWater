var rhit = rhit || {};

rhit.FB_COLLECTION_TAPWATER = "TapWater";
rhit.FB_KEY_AUTHOR = "author";
rhit.FB_KEY_CAPTION = "caption";
rhit.FB_KEY_IMAGE = "image";
rhit.FB_KEY_LAST_TOUCHED = "lastTouched";
rhit.fbImageCaptionsManager = null;
rhit.fbSingleImageManager = null;
rhit.fbCardImagesManager = null;
rhit.fbStacksManager = null;
rhit.fbAuthManager = null;
rhit.fbUserManager = null;

function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

rhit.ListPageController = class {
	constructor() {
		console.log("Created ListPageController");

		document.querySelector("#menuShowMyImages").addEventListener("click", (event) => {
			console.log("show my images");
			window.location.href = `/tablelist.html?uid=${rhit.fbAuthManager.uid}`;
		});

		document.querySelector("#menuSignOut").addEventListener("click", (event) => {
			console.log("sign out");
			rhit.fbAuthManager.signOut();
		});

		document.querySelector("#submitAddImage").addEventListener("click", (event) => {
			const image = document.querySelector("#inputImage").value;
			const caption = document.querySelector("#inputName").value;
			console.log(`image ${image}`);
			console.log(`caption ${caption}`);
			rhit.fbImageCaptionsManager.add(image, caption);
		});

		$("addImageDialog").on("show.bs.modal", (event) => {
			//pre animation
			console.log("dialog about to show up");
			//document.querySelector("#inputImage").value = "";
			document.querySelector("#inputName").value = "";
		});
		$("addImageDialog").on("shown.bs.modal", (event) => { 
			//post animation
			console.log("dialog is now visible");
			document.querySelector("#inputName").focus();
		});

		$("deleteImageDialog").on("show.bs.modal", (event) => {
			//pre animation
			console.log("dialog about to show up");
			//document.querySelector("#inputImage").value = "";
			document.querySelector("#inputName").value = "";
		});
		$("deleteImageDialog").on("shown.bs.modal", (event) => { 
			//post animation
			console.log("dialog is now visible");
			document.querySelector("#inputName").focus();
		});


		//Start listening
		rhit.fbImageCaptionsManager.beginListening(this.updateList.bind(this));


	}

	_createCard(imageCaption) {
		console.log("Created card");
		return htmlToElement(`
		<div class="pin"><img
        src="${imageCaption.image}"
        alt= "${imageCaption.caption}">
      <p class="caption">"${imageCaption.caption}"</p>
	  </div>`);
	  
	}



	updateList() {
		console.log("List needs updating.");
		console.log(`# images = ${rhit.fbImageCaptionsManager.length}`);
		console.log("Example images = ", rhit.fbImageCaptionsManager.getImageCaptionAtIndex(0));

		const newList = htmlToElement('<div id="columns"></div>');
		for(let i = 0; i < rhit.fbImageCaptionsManager.length; i++) {
			const mq = rhit.fbImageCaptionsManager.getImageCaptionAtIndex(i);
			const newCard = this._createCard(mq);
			newCard.onclick = (event) => {
				console.log(`You clicked on ${mq.id}`);

				window.location.href = `/table.html?id=${mq.id}`;
			};
			newList.appendChild(newCard);
		}
		const oldList = document.querySelector("#columns");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
	}

}

rhit.ImageCaption = class {
	constructor(id, image, caption) {
		console.log("Created ImageCaption");
		this.id = id;
		this.image = image;
		this.caption = caption;
	}
}

rhit.CardImage = class {
	constructor(url, name, x, y, z, id, height, width, stackId) {
		this.id = id
		this.url = url
		this.name = name
		this.posX = x
		this.posY = y
		this.height = height
		this.width = width
		this.z = z
		this.stackId = stackId
		console.log("Created CardImage with name " + name + " and url " + url + 
		". Has position X: " + this.posX + " and position Y: " + this.posY +
		". Has height " + this.height + " and width " + this.width +
		". zIndex is " + this.z + " and Id is " + this.id)
	}
}

rhit.cardStack = class {
	constructor(id, name, posX, posY) {
		this.id = id;
		this.name = name;
		this.posX = posX;
		this.posY = posY;
		console.log("created stack id: " + this.id);
	}
}

rhit.fbImageCaptionsManager = class {
	constructor(uid) {
		this._uid = uid;
		console.log("Created fbImageCaptionsManager");
		this._documentSnapshots = [];

		//Uncaught TypeError: firebase.firestone is not a function
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_TAPWATER);

		this._unsubscribe = null;
	}
	
	add(image, caption) {
		console.log("Inside add function");
		console.log(`add image ${image}`);
		console.log(`add caption ${caption}`);

		this._ref.add({
			[rhit.FB_KEY_IMAGE]: image,
			[rhit.FB_KEY_CAPTION]: caption,
			[rhit.FB_KEY_AUTHOR]: rhit.fbAuthManager.uid,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),

			})
			.then(function (docRef) {
				console.log("Document written with ID: ", docRef.id);
			})
			.catch(function (error) {
				console.log("Error adding document: ", error);
			});
	}
	beginListening(changeListener) {
		let query = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc").limit(10);
		if(this._uid) {
			if(this._uid != rhit.fbAuthManager.uid) {
				window.location.href = `/tablelist.html?uid=${rhit.fbAuthManager.uid}`;
			}
			query = query.where(rhit.FB_KEY_AUTHOR, "==", this._uid);
		} else {
			window.location.href = `/tablelist.html?uid=${rhit.fbAuthManager.uid}`;
		}
		this._unsubscribe = query.onSnapshot((querySnapshot) => {
				console.log("Photo bucket update!");
				this._documentSnapshots = querySnapshot.docs;
				changeListener();
		});
	}
	stopListening() {
		this._unsubscribe();
	}
	get length() {
		return this._documentSnapshots.length;
	}
	getImageCaptionAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const mq = new rhit.ImageCaption(
			docSnapshot.id,
			docSnapshot.get(rhit.FB_KEY_IMAGE),
			docSnapshot.get(rhit.FB_KEY_CAPTION)
		);
		return mq;
	}
}

rhit.fbStacksManager = class {
	constructor(tableID) {
		this._tableID = tableID;
		console.log("Created fbStacksManager");
		this._documentSnapshots = [];

		//Uncaught TypeError: firebase.firestone is not a function
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_TAPWATER).doc(tableID);

		this._unsubscribe = null;
	}
	
	add(name) {
		console.log(`add name ${name}`);

		 return this._ref.collection("stacks").add({
			stackName: name,
			stackX: 0,
			stackY: 0,
			lastTouched: firebase.firestore.Timestamp.now()
		})
		.catch(function (error) {
			console.log("Error adding document: ", error);
		});
	}

	beginListening(changeListener) {
		let query = this._ref.collection("stacks").orderBy("stackName", "desc");
		this._unsubscribe = query.onSnapshot((querySnapshot) => {
				console.log("Stacks update!");
				this._documentSnapshots = querySnapshot.docs;
				changeListener();
		});
	}
	stopListening() {
		this._unsubscribe();
	}
	get length() {
		return this._documentSnapshots.length;
	}
	getStackAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const s = new rhit.cardStack(docSnapshot.id, docSnapshot.get("stackName"), docSnapshot.get("stackX"), docSnapshot.get("stackY"))
		return s;
	}
	update(id, updatedName) {
		const currentStack = this._ref.collection("stacks").doc(id)
		console.log(currentStack)
		currentStack.update({
			["stackName"]: updatedName
		})
	}
	delete(id) {
		this._ref.collection("stacks").doc(id).delete()
	}
}

rhit.fbCardImagesManager = class {
	constructor(tableID) {
		this._tableID = tableID;
		console.log("Created fbCardImagesManager");
		this._documentSnapshots = [];

		//Uncaught TypeError: firebase.firestone is not a function
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_TAPWATER).doc(tableID);

		this._unsubscribe = null;
	}
	
	add(url, name, height, width) {
		console.log(`add url ${url}`);
		console.log(`add name of the file ${name}`);
		//console.log(`add x position ${x}`);
		//console.log(`add y position ${y}`);

		this._ref.collection("cards").add({
			cardUrl: url,
			cardName: name,
			cardX: 100,
			cardY: 100,
      stackId: "",
			lastTouched: firebase.firestore.Timestamp.now(),
			cardHeight: height,
			cardWidth: width
		})
		.catch(function (error) {
			console.log("Error adding document: ", error);
		});
	}

	beginListening(changeListener) {
		let query = this._ref.collection("cards").orderBy("lastTouched", "asc");
		this._unsubscribe = query.onSnapshot((querySnapshot) => {
				console.log("Card update!");
				this._documentSnapshots = querySnapshot.docs;
				changeListener();
		});
	}
	stopListening() {
		this._unsubscribe();
	}
	get length() {
		return this._documentSnapshots.length;
	}

	updatePosX(posX, index) {
		const xRef = this._ref.collection("cards")
		// need to get the x coordinate
		xRef.update({
			["cardX"]: posX,
		})
		.then(() => {
			console.log("Updated position X!")
		})
		.catch(function (error) {
			console.error("Error updating document: ", error)
		})
	}

	setImgSize(size) {
		const cards = document.querySelectorAll('.draggable')
		for (let card of cards) {
			card.setAttribute('height', size)
			card.setAttribute('width', size)
		}
	}

	getCardImageAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const mq = new rhit.CardImage(
			docSnapshot.get("cardUrl"),
			docSnapshot.get("cardName"),
			parseFloat(docSnapshot.get("cardX")),
			parseFloat(docSnapshot.get("cardY")),
			parseFloat(docSnapshot.get("cardZ")),
			docSnapshot.id,
			docSnapshot.get("cardHeight"),
			docSnapshot.get("cardWidth"),
			docSnapshot.get("stackId")
		);
		return mq;
	}
}


rhit.DetailPageController = class {
	constructor() {
		console.log("Made the detail page controller");

		const urlParams = new URLSearchParams(window.location.search);
		const ImageCaptionId = urlParams.get("id");
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_TAPWATER).doc(ImageCaptionId);

		// const elements = document.querySelectorAll('.some-selector');
		// const sortedElements = Array.from(elements).sort((a, b) => a.textContent.localeCompare(b.textContent)); // Sort by text content
		// const firstElement = sortedElements[0]; // Access the first element

		//let query = this._ref.collection("cards").orderBy("lastTouched", "asc").limit(1);

		// const docRef = firebase.firestore().collection('TapWater').doc(new URLSearchParams(window.location.search).get('id')).collection('cards').doc(this.el.getAttribute('data-id'))
		// docRef.update({
		// 	cardX: this.el.posX,
		// 	cardY: this.el.posY,
		// 	cardZ: this.el.style.zIndex,
		// 	lastTouched: firebase.firestore.Timestamp.now()
		// })
		// .then(() => {
		// 	console.log('Stored position!')
		// })
		// .catch((error) => {
		// 	console.error('Error updating document: ', error)
		// })

		document.querySelector("#zoomInButton").addEventListener("click", (event) => {
			let query = this._ref.collection("cards").orderBy("lastTouched", "desc").limit(1)
			query.get().then((querySnapshot) => {
				if (!querySnapshot.empty) {
				  	const firstDocument = querySnapshot.docs[0];

					const currentWidth = firstDocument.data().cardWidth;
					const currentHeight = firstDocument.data().cardHeight;
					const increasePercentage = 5; // increase by 5% of current dimensions
					const newWidth = Math.round(currentWidth * (1 + increasePercentage/100));
					const newHeight = Math.round(currentHeight * (1 + increasePercentage/100));
					
					firstDocument.ref.update({
						cardHeight: newHeight,
						cardWidth: newWidth,
						lastTouched: firebase.firestore.Timestamp.now()
					})
					.then(() => {
						console.log('zoomed in')
					})
					.catch((error) => {
						console.error('Error updating document: ', error)
					})
				} else {
				  	console.log("No documents found.")
				}
			}).catch((error) => {
				console.error("Error getting documents:", error)
			});
		});

		document.querySelector("#zoomOutButton").addEventListener("click", (event) => {
			let query = this._ref.collection("cards").orderBy("lastTouched", "desc").limit(1)
			query.get().then((querySnapshot) => {
				if (!querySnapshot.empty) {
				  	const firstDocument = querySnapshot.docs[0];

					const currentWidth = firstDocument.data().cardWidth;
					const currentHeight = firstDocument.data().cardHeight;
					const increasePercentage = 5; // increase by 10% of current dimensions
					const newWidth = Math.round(currentWidth * (1 - increasePercentage/100));
					const newHeight = Math.round(currentHeight * (1 - increasePercentage/100));

					firstDocument.ref.update({
						cardHeight: newHeight,
						cardWidth: newWidth,
						lastTouched: firebase.firestore.Timestamp.now()
					})
					.then(() => {
						console.log('zoomed in')
					})
					.catch((error) => {
						console.error('Error updating document: ', error)
					})
				} else {
				  	console.log("No documents found.")
				}
			}).catch((error) => {
				console.error("Error getting documents:", error)
			});
		});

		document.querySelector("#deletingCardButton").addEventListener("click", (event) => {
			//rhit.fbStacksManager.delete(document.querySelector("#deleteStackId").innerText);
			let query = this._ref.collection("cards").orderBy("lastTouched", "desc").limit(1)
			query.get().then((querySnapshot) => {
				if (!querySnapshot.empty) {
				  	const firstDocument = querySnapshot.docs[0];
					firstDocument.ref.delete()
					.then(() => {
						console.log('deleted card')
					})
					.catch((error) => {
						console.error('Error updating document: ', error)
					})
				} else {
				  	console.log("No documents found.")
				}
			}).catch((error) => {
				console.error("Error getting documents:", error)
			});
		});

		document.querySelector("#addingCardsButton").addEventListener("click", (event) => {
			document.querySelector("#fileInput").click();
		});

		document.querySelector("#addingStacksButton").addEventListener("click", (event) => {
			rhit.fbStacksManager.add("New Stack");
		})
		
		document.addEventListener('DOMContentLoaded', () => {
			const cardStack = document.querySelector('.cardStack');
			const dropdownMenu = document.querySelector('.dropdown-menu-right');
			let isDragging = false;
			let mouseOffsetX = 0;
			let mouseOffsetY = 0;
			cardStack.querySelector('.stackName').addEventListener('mousedown', (event) => {
				isDragging = true;
				mouseOffsetX = event.clientX - cardStack.offsetLeft;
				mouseOffsetY = event.clientY - cardStack.offsetTop;
			});
			document.addEventListener('mousemove', (event) => {
				if(isDragging) {
					cardStack.style.left = (event.clientX - mouseOffsetX) + 'px';
					cardStack.style.top = (event.clientY - mouseOffsetY) + 'px';
					dropdownMenu.style.left = (event.clientX - mouseOffsetX) + 'px';
					dropdownMenu.style.top = (event.clientY - mouseOffsetY + cardStack.offsetHeight) + 'px';
				}
			});
			document.addEventListener('mouseup', () => {
				isDragging = false;
				console.log("Inside mouse up");
			});
		})

		document.addEventListener('DOMContentLoaded', () => {
			const dropdownMenu = document.querySelector('.dropdown-menu-right');
			const menuButton = document.querySelector('#lr2');
			console.log("Testing");
			if(dropdownMenu && menuButton) {
				console.log("I was clicked");
				menuButton.addEventListener('click', () => {
					dropdownMenu.classList.toggle('show');
				});
			}
		})

		document.querySelector("#fileInput").addEventListener("change", (event) => {
			const files = event.target.files;
			// console.log(files);
			for(let i = 0; i < files.length; i++) {
				console.log(files[i]);
				rhit.fbSingleImageManager.uploadPhotoToStorage(files[i]);
			}
		});

		document.querySelector("#menuSignOut").addEventListener("click", (event) => {
			console.log("sign out");
			rhit.fbAuthManager.signOut();
		});
		document.querySelector("#submitEditImage").addEventListener("click", (event) => {
			const image = rhit.fbSingleImageManager.image;
			const caption = document.querySelector("#inputName").value;
			console.log(`image ${image}`);
			console.log(`caption ${caption}`);
			rhit.fbSingleImageManager.update(null, caption);
		});

		document.querySelector("#submitEditStack").addEventListener("click", (event) => {
			const name = document.querySelector("#inputStackName").value;
			console.log(`name ${name}`);
			rhit.fbStacksManager.update(document.querySelector("#internalStackId").innerText, name);
		});

		$("editImageDialog").on("show.bs.modal", (event) => {
			//pre animation
			console.log("dialog about to show up");
			document.querySelector("#inputImage").src = rhit.fbSingleImageManager.image;
			document.querySelector("#inputName").value = rhit.fbSingleImageManager.caption;
		});
		$("editImageDialog").on("shown.bs.modal", (event) => {
			//post animation
			console.log("dialog is now visible");
			document.querySelector("#inputName").focus();
		});

		$("editStackDialog").on("show.bs.modal", (event) => {
			//pre animation
			console.log("dialog about to show up");
			//document.querySelector("#inputImage").src = rhit.fbSingleImageManager.image;
			document.querySelector("#inputStackName").value = rhit.fbSingleImageManager.caption;
		});
		$("editStackDialog").on("shown.bs.modal", (event) => {
			//post animation
			console.log("dialog is now visible");
			document.querySelector("#inputStackName").focus();
		});

		document.querySelector("#submitDeleteImage").addEventListener("click", (event) => {
			rhit.fbSingleImageManager.delete().then(function () {
				console.log("Document successfully deleted!");
				window.location.href = `/tablelist.html?uid=${rhit.fbAuthManager.uid}`;
			}).catch(function (error) {
				console.error("Error removing document: ", error);
			});
		});
		document.querySelector("#submitDeleteStack").addEventListener("click", (event) => {
			rhit.fbStacksManager.delete(document.querySelector("#deleteStackId").innerText);
		});

		rhit.fbSingleImageManager.beginListening(this.updateView.bind(this));
		rhit.fbCardImagesManager.beginListening(this.updateView.bind(this));
		rhit.fbStacksManager.beginListening(this.updateView.bind(this))
	}
	updateView() {

		//document.querySelector("#cardImage").src = rhit.fbSingleImageManager.image;
		//document.querySelector("#cardImage").alt = rhit.fbSingleImageManager.caption;
		document.querySelector("#displayTableName").innerHTML = rhit.fbSingleImageManager.caption;
		
		// this._ref.onSnapshot((querySnapshot) => {
		// 	querySnapshot.forEach((doc) => {
		// 		console.log("Document Name: " + doc.id); // For doc name
		// 		//`/TapWater/${doc.id}/images`
		// 	})
		// })
		
		if(rhit.fbSingleImageManager.author == rhit.fbAuthManager.uid) {
			document.querySelector("#menuEdit").style.display = "flex";
			document.querySelector("#menuDelete").style.display = "flex";
		}

		console.log("List needs updating.");
		//console.log(`# images = ${rhit.fbCardImagesManager.length}`);
		//console.log("Example images = ", rhit.fbCardImagesManager.getCardImageAtIndex(0));

		const newList = htmlToElement('<div id="cards"></div>');
		for(let i = 0; i < rhit.fbCardImagesManager.length; i++) {
			const ci = rhit.fbCardImagesManager.getCardImageAtIndex(i);
			const newCard = this._createCard(ci);
			console.log(newCard);
			newList.appendChild(newCard);
		}
		for(let i = 0; i < rhit.fbStacksManager.length; i++) {
			const s = rhit.fbStacksManager.getStackAtIndex(i);
			const newStack = this._createStack(s);
			newList.appendChild(newStack);
		}
		const oldList = document.querySelector("#cards");
		oldList.removeAttribute("id");
		oldList.innerHTML = "";
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);

		const draggables = document.querySelectorAll('.draggable');
		for (let draggable of draggables) {
			new Draggable(draggable, draggable.style.left, draggable.style.top);
		}

		for (let queries of document.querySelectorAll(".menuEdit")) {
			queries.addEventListener("click", (event) => {

				// for (let el of document.querySelectorAll('.cardStack')) {
				// 	console.log(el.getAttribute('stack-id'))
				// }

				document.querySelector("#internalStackId").innerText = queries.getAttribute('data-id');
				console.log(queries.getAttribute('data-id'));
				// const modalTrigger = document.querySelector(`[data-id="${queries.getAttribute('data-id')}"] [data-target="#editStackDialog"]`);
				// console.log(modalTrigger)
  				// modalTrigger.click()		  
			})
		}
		for (let queries of document.querySelectorAll(".menuDelete")) {
			queries.addEventListener("click", (event) => {
				document.querySelector("#deleteStackId").innerText = queries.getAttribute('data-id');
			})
		}
		for (let queries of document.querySelectorAll(".menuShuffle")) {
			queries.addEventListener("click", (event) => {
				for (let el of document.querySelectorAll(`[stack-id="${queries.getAttribute('data-id')}"]`)) {
					this._ref.collection('cards').doc(el.getAttribute('data-id')).update({
						lastTouched: new firebase.firestore.Timestamp(firebase.firestore.Timestamp.now().seconds - Math.random() * 1000, 0)
					})
				}
			})
		}

	}
	_createCard(cardImage) {
		return htmlToElement(`<img class="draggable" data-id=${cardImage.id} width=${cardImage.width} height=${cardImage.height} src=${cardImage.url} alt="${cardImage.name}" style=" left: ${cardImage.posX}px; top: ${cardImage.posY}px; position: absolute; z-index: ${cardImage.z};" stack-id="${cardImage.stackId}">`);
	}
	_createStack(stackName) {
		return htmlToElement(`<div><div class="card cardStack draggable position-absolute" id="${stackName.id}" style=" left: ${stackName.posX}px; top: ${stackName.posY}px; position: absolute; z-index: 0;">
		<div class="card-body">
		  <ul class="nav nav-pills card-header-pills justify-content-left">
			<li class="nav-item">
			  <a class="stackName">${stackName.name}</a>
			</li>
		  </ul>
		  <hr>
		</div>
	  </div>
	  <div class="dropdown pull-xs-right" stack="${stackName.id}" style=" left: ${stackName.posX + 250}px; top: ${stackName.posY + 3}px; position: absolute; z-index: 1000;">
				<button class="btn bmd-btn-icon dropdown-toggle" type="button" id="lr2" data-toggle="dropdown" aria-haspopup="true">
				  <i id="options" class="material-icons stackMenu">more_vert</i>
				</button>
				<div class="dropdown-menu dropdown-menu-right" aria-labelledby="lr2">
				  <button class="dropdown-item menuDraw" type="button" data-toggle="modal" data-target="#drawImageDialog"><i class="material-icons">draw</i>&nbsp;&nbsp;&nbsp;Draw</button>
				  <button class="dropdown-item menuShuffle" type="button" data-toggle="modal" data-target="#shuffleImageDialog" data-id="${stackName.id}"><i class="material-icons">shuffle</i>&nbsp;&nbsp;&nbsp;Shuffle</button>
				  <button class="dropdown-item menuSearch" type="button" data-toggle="modal" data-target="#searchImageDialog"><i class="material-icons">search</i>&nbsp;&nbsp;&nbsp;Search</button>
				  <button class="dropdown-item menuEdit" type="button" data-toggle="modal" data-target="#editStackDialog" data-id="${stackName.id}"><i class="material-icons">edit</i>&nbsp;&nbsp;&nbsp;Edit Name</button>
				  <button class="dropdown-item menuDelete" type="button" data-toggle="modal" data-target="#deleteStackDialog" data-id="${stackName.id}"><i class="material-icons">delete</i>&nbsp;&nbsp;&nbsp;Delete</button>
				</div>
	  </div></div>`)
	}
}


rhit.fbSingleImageManager = class {
	constructor(ImageCaptionId) {
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._captionId = ImageCaptionId;

		//Uncaught TypeError: firebase.firestone is not a function
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_TAPWATER).doc(ImageCaptionId);
		
		console.log(`Listing to ${this._ref.path}`);
	}
	beginListening(changeListener) {
		this._unsubscribe = this._ref.onSnapshot((doc) => {
			if(doc.exists) {
				console.log("Document data:", doc.data());
				this._documentSnapshot = doc;
				changeListener();
			}
			else {
				console.log("No such document!");
				//window.location.href = "/";
			}
		});
	}
	stopListening() {
		this._unsubscribe();
	}
	update(image, caption) {
		console.log("Updated image!");

		this._ref.update({
			[rhit.FB_KEY_IMAGE]: image,
			[rhit.FB_KEY_CAPTION]: caption,
			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now(),
			})
			.then(() => {
				console.log("Document successfully updated!");
			})
			.catch(function (error) {
				console.log("Error updating document: ", error);
			});
	}
	uploadPhotoToStorage(file) {
		const metadata = {
			"content-type": file.type
		};
		let image;
		const storageRef = firebase.storage().ref().child(this._captionId+"/"+file.name);
		storageRef.put(file, metadata).then((uploadSnapshot) => {
			storageRef.getDownloadURL().then((downloadURL) => {
				const img = new Image();
				img.onload = function() {
				  	const width = this.naturalWidth;
				  	const height = this.naturalHeight;
				  	console.log(`Image size: ${width} x ${height}`);
				  	image = rhit.fbCardImagesManager.add(downloadURL, file.name, height, width);
				};
				img.src = URL.createObjectURL(file);
			});
		});
		console.log("upload:", file.name);
		return image;
	}
	delete() {
		return this._ref.delete();
	}

	get image() {
		return this._documentSnapshot.get(rhit.FB_KEY_IMAGE);
	}
	get caption() {
		return this._documentSnapshot.get(rhit.FB_KEY_CAPTION);
	}
	get author() {
		return this._documentSnapshot.get(rhit.FB_KEY_AUTHOR); 
	}
}

rhit.LoginPageController = class {
	constructor() {
		document.querySelector("#roseFireButton").onclick = (event) => {
			rhit.fbAuthManager.signIn();
		}
	}
}

rhit.OpeningPageController = class {
	constructor() {
		document.querySelector("#loginButton").onclick = (event) => {
			window.location.href = "/loginpage.html";
		}
	}
}

rhit.FbAuthManager = class {
	constructor() {
		this._user = null;
		console.log("auth manage");
	}
	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged((user) => {
			this._user = user;
			changeListener();
		});
	}
	signIn() {
		console.log("sign in!");
		Rosefire.signIn("f918f4a6-2233-42d4-ac3b-4fa49fa5cd43", (err, rfUser) => {
			if(err) {
				console.log("rf error", err);
				return;
			}
			console.log("rf success", rfUser);
			firebase.auth().signInWithCustomToken(rfUser.token).catch(function (error) {
				const errorCode = error.code;
				const errorMessage = error.message;
				if(errorCode === 'auth/invalid-custom-token') {
					alert('The token you provided is not valid.');
				} else {
					console.error("Custom auth error", errorCode, errorMessage);
				}
			});
		});
	}
	signOut() {
		firebase.auth().signOut().catch(function (error) {
			console.log("not signed out.");
		});
	}
	get isSignedIn() {
		return !!this._user; //casts truth or falsey value
	}
	get uid() {
		return this._user.uid;
	}
}

rhit.checkForRedirects = function() {
	if(document.querySelector("#loginPage") && rhit.fbAuthManager.isSignedIn) {
		window.location.href = `/tablelist.html?uid=${rhit.fbAuthManager.uid}`;
	}
	if(!document.querySelector("#loginPage") && !document.querySelector("#openingPage") && !rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/loginpage.html";
	}
};

rhit.initializePage = function() {
	const urlParams = new URLSearchParams(window.location.search);
	if(document.querySelector("#listPage")) {
		console.log("List Page!");
		const uid = urlParams.get("uid");
		console.log("got url param =", uid);
		rhit.fbImageCaptionsManager = new rhit.fbImageCaptionsManager(uid);
		new rhit.ListPageController();
	}

	if(document.querySelector("#detailPage")) {
		console.log("Detail Page!");
		const ImageCaptionId = urlParams.get("id");

		console.log(`Detail page for ${ImageCaptionId}`);
		if(!ImageCaptionId) {
			console.log("Error! Missing caption image id!");
			window.location.href = "/";
		}
		rhit.fbSingleImageManager = new rhit.fbSingleImageManager(ImageCaptionId);
		rhit.fbCardImagesManager = new rhit.fbCardImagesManager(ImageCaptionId);
		rhit.fbStacksManager = new rhit.fbStacksManager(ImageCaptionId);
		new rhit.DetailPageController();
	}

	if(document.querySelector("#loginPage")) {
		console.log("Login Page!");
		new rhit.LoginPageController();
		rhit.startFirebaseUI();
	}

	if(document.querySelector("#openingPage")) {
		console.log("Opening Page!");
		new rhit.OpeningPageController();
	}
};

// card.onMouseDown = function(event) {
// 	let shiftX = event.clientX - card.getBoundingClientRect().left;
// 	let shiftY = event.clientY - card.getBoundingClientRect().top;
	  
// 	card.style.position = 'absolute';
// 	card.style.zIndex = 1000;
// 	document.body.append(card);
	  
// 	moveAt(event.pageX, event.pageY);
	  
// 	// moves the card at (pageX, pageY) coordinates
// 	// taking initial shifts into account
// 	function moveAt(pageX, pageY) {
// 		card.style.left = pageX - shiftX + 'px';
// 		card.style.top = pageY - shiftY + 'px';
// 	};
	  
// 	function onMouseMove(event) {
// 		moveAt(event.pageX, event.pageY);
// 	};
	  
// 	// move the card on mousemove
// 	document.addEventListener('mousemove', onMouseMove);
	  
// 	// drop the card, remove unneeded handlers
// 	card.onmouseup = function() {
// 		document.removeEventListener('mousemove', onMouseMove);
// 		card.onmouseup = null;
// 	};

// 	card.ondragstart = function() {
// 		return false;
// 	};
// }

/* Main */
/** function and class syntax examples */
rhit.main = function () {
	console.log("Ready");
	rhit.fbAuthManager = new rhit.FbAuthManager();
	rhit.fbAuthManager.beginListening(() => {
		console.log("auth change callback");
		console.log("isSignedIn = ", rhit.fbAuthManager.isSignedIn);
		rhit.checkForRedirects();
		rhit.initializePage();
	});
};

rhit.startFirebaseUI = function() {
	      // FirebaseUI config.
		  var uiConfig = {
			signInSuccessUrl: '<url-to-redirect-to-on-success>',
			signInOptions: [
			  // Leave the lines as is for the providers you want to offer your users.
			  firebase.auth.GoogleAuthProvider.PROVIDER_ID,
			  firebase.auth.EmailAuthProvider.PROVIDER_ID,
			  firebase.auth.PhoneAuthProvider.PROVIDER_ID,
			  firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID
			],
		  };
	
		  // Initialize the FirebaseUI Widget using Firebase.
		  var ui = new firebaseui.auth.AuthUI(firebase.auth());
		  // The start method will wait until the DOM is loaded.
		  ui.start('#firebaseui-auth-container', uiConfig);
}

rhit.main();

class Draggable {

	constructor(el, x, y) {
		this.el = el
		this.shiftX = x
		this.shiftY = y
		this.onMouseDown = this.onMouseDown.bind(this)
		this.onMouseMove = this.onMouseMove.bind(this)
		this.onMouseUp = this.onMouseUp.bind(this)
		this.addEventHandlers()
	}
	
	addEventHandlers() {
		this.el.addEventListener('mousedown', this.onMouseDown)
		this.el.addEventListener('dragstart', e => e.preventDefault())
		this.el.addEventListener('mouseup', this.onMouseUp)
	}
	
	onMouseDown(e) {
		this.getDragPointer(e.clientX, e.clientY)
		this.prepareElement()
		this.unprepareOtherElements()
		this.moveElementTo(e.pageX, e.pageY)
		document.addEventListener('mousemove', this.onMouseMove)
		//console.log("Card " + this.el.getAttribute('alt') + "'s Initial Position X: " + this.el.posX + ", Position Y: " + this.el.posY)
	}
	
	getDragPointer(x, y) {
		const elRect = this.el.getBoundingClientRect()
		console.log(this.el.nodeName)
		this.shiftX = x - elRect.left
		this.shiftY = y - elRect.top
	}
	
	// sets card being clicked to the front
	prepareElement() {
		//this.el.style.position = 'absolute'
		if (this.el.nodeName == 'IMG') {
			this.el.style.zIndex = 999
		}
	}

	// need to go through every other card and set them to the back
	unprepareOtherElements() {
		const cards = document.querySelectorAll('.draggable')
		for (let card of cards) {
			// check if the current card is the element being clicked
			// if not, set its z-index to 0
			if(card.getAttribute('alt') != this.el.getAttribute('alt') && card.style.zIndex > 0) {
				card.style.zIndex -= 1
			}
		}
	}

	setPositions(e) {
		const elRect = this.el.getBoundingClientRect()
		this.el.posX = elRect.left
		this.el.posY = elRect.top
		console.log("Card " + this.el.getAttribute('alt') + "'s New Position X: " + this.el.posX + ", Position Y: " + this.el.posY)
		if (this.el.nodeName == 'IMG') {
			for (let el of document.querySelectorAll('.cardStack')) {
				let rect = el.getBoundingClientRect();
				if (e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom){
					this.el.setAttribute('stack-id', el.id);
					let imgDocRef = firebase.firestore().collection('TapWater').doc(new URLSearchParams(window.location.search).get('id')).collection('cards').doc(this.el.getAttribute('data-id'))
					console.log(rect.left)
					console.log(rect.top)
					this.el.style.left = rect.left;
					this.el.style.top = rect.top;
					imgDocRef.update({
						cardX: rect.left + 15,
						cardY: rect.top + 42.8 + 15,
						cardWidth: rect.width - 30,
						cardHeight: elRect.height * (rect.width - 30) / elRect.width,
						cardZ: this.el.style.zIndex,
						lastTouched: firebase.firestore.Timestamp.now(),
						stackId: this.el.getAttribute('stack-id')
					})
					return;
				} else {
					this.el.setAttribute('stack-id', "");
				}
			}
			const docRef = firebase.firestore().collection('TapWater').doc(new URLSearchParams(window.location.search).get('id')).collection('cards').doc(this.el.getAttribute('data-id'))
			docRef.update({
				cardX: this.el.posX,
				cardY: this.el.posY,
				cardZ: this.el.style.zIndex,
				lastTouched: firebase.firestore.Timestamp.now(),
				stackId: this.el.getAttribute('stack-id')
			})
			.then(() => {
				console.log('Stored position!')
			})
			.catch((error) => {
				console.error('Error updating document: ', error)
			})
		} else {
			for (let el of document.querySelectorAll(`[stack-id="${this.el.id}"]`)) {
				let imgDocRef = firebase.firestore().collection('TapWater').doc(new URLSearchParams(window.location.search).get('id')).collection('cards').doc(el.getAttribute('data-id'))
				let imgRect = el.getBoundingClientRect();
				imgDocRef.update({
					cardX: this.el.posX + 15,
					cardY: this.el.posY + 42.8 + 15,
				})
			}
			const docRef = firebase.firestore().collection('TapWater').doc(new URLSearchParams(window.location.search).get('id')).collection('stacks').doc(this.el.id)
			docRef.update({
				stackX: this.el.posX,
				stackY: this.el.posY,
				lastTouched: firebase.firestore.Timestamp.now()
			})
			.then(() => {				
				console.log('Stored position!')
			})
			.catch((error) => {
				console.error('Error updating document: ', error)
			})
		}
	}
	
	moveElementTo(x, y) {
		const leftPosition = x - this.shiftX < 0 ? 0 : x - this.shiftX
		const topPosition = y - this.shiftY < 0 ? 0 : y - this.shiftY
		this.el.style.left = `${leftPosition}px`
		this.el.style.top = `${topPosition}px`
		if (this.el.nodeName == 'DIV') {
			for (let el of document.querySelectorAll(`[stack-id=${this.el.id}]`)) {
				el.style.left = `${leftPosition + 15}px`
				el.style.top = `${topPosition + 42.8 + 15}px`
			}
			document.querySelector(`[stack="${this.el.id}"]`).setAttribute('style', `position: absolute; left: ${leftPosition + 250}px; top: ${topPosition + 3}px; zIndex: 999;`)
		}
	}
	
	onMouseMove(e) {
		this.moveElementTo(e.pageX, e.pageY)
	}
	
	onMouseUp(e) {
		document.removeEventListener('mousemove', this.onMouseMove)
		this.setPositions(e);
	}
	
}
