/*! (c) gotoAndPlay | All rights reserved */
(window["webpackJsonpapplication"] = window["webpackJsonpapplication"] || []).push([["module-6"],{

/***/ "./src/managers/file-datasource-manager.js":
/*!*************************************************!*\
  !*** ./src/managers/file-datasource-manager.js ***!
  \*************************************************/
/*! exports provided: FileDataSourceManager */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FileDataSourceManager", function() { return FileDataSourceManager; });
class FileDataSourceManager
{
	constructor(libFolder, protectedFolders, fileSeparator)
	{
		this._protectedFolders = protectedFolders; // Folders which can't be deleted (but their content can)
		this._libFolder = libFolder;
		this._fileSeparator = fileSeparator;
	}

	get dataSource()
	{
		return this._dataSource;
	}

	init()
	{
		this._dataSource = new kendo.data.TreeListDataSource({
			data: [],
			schema: {
				model: {
					id: 'id',
					parentId: 'parentId',
					expanded: false
				}
			},
			sort: { field: 'name', dir: 'asc' }
		});
	}

	addFile(fileObj, parentLevel = null)
	{
		let file = {};

		file.name = fileObj.getUtfString('name');
		file.isDir = fileObj.getBool('isDir');
		file.lastMod = fileObj.getLong('lastMod');
		file.isLib = (file.isDir && file.name == this._libFolder);
		file.isProtected = (file.isDir && this._protectedFolders.indexOf(file.name) > -1);
		file.size = 0;

		if (parentLevel == null)
			file.level = 0;
		else
			file.level = parentLevel + 1;

		if (fileObj.containsKey('parent'))
		{
			file.parentId = fileObj.getUtfString('parent');
			file.id = file.parentId + this._fileSeparator + file.name;
		}
		else
		{
			file.parentId = null;
			file.id = file.name;
		}

		// Add child files
		if (file.isDir)
		{
			let filesArr = fileObj.getSFSArray('files');

			for (let i = 0; i < filesArr.size(); i++)
				file.size += this.addFile(filesArr.getSFSObject(i), file.level);
		}
		else
			file.size = fileObj.getLong('size');

		// Add file to data source
		this._dataSource.add(file);

		// Return file size
		return file.size;
	}

	removeFile(id)
	{
		let fileItem = this._dataSource.get(id);

		if (fileItem)
		{
			if (fileItem.parentId)
			{
				// Subtract old size from parent size
				let parentItem = this._dataSource.get(fileItem.parentId);
				this._updateParentSize(parentItem, -fileItem.size);
			}

			this._dataSource.remove(fileItem);

			// Return parent item
			if (fileItem.parentId)
				return this._dataSource.get(fileItem.parentId);
		}
	}

	getFileById(id)
	{
		return this._dataSource.get(id);
	}

	addFileToParent(fileObj, parentId)
	{
		let parentItem = this._dataSource.get(parentId);

		if (parentItem != null && parentItem.isDir)
		{
			const fileId = parentId + this._fileSeparator + fileObj.getUtfString('name');
			let fileItem = this._dataSource.get(fileId);

			if (fileItem != null)
			{
				// Subtract old size from parent size
				this._updateParentSize(parentItem, -fileItem.size);

				// Update existing item
				fileItem.name = fileObj.getUtfString('name');
				fileItem.lastMod = fileObj.getLong('lastMod');
				fileItem.size = fileObj.getLong('size');
			}
			else
			{
				// Add new item
				this.addFile(fileObj, parentItem.level);
			}

			// Update parent item size
			this._updateParentSize(parentItem, fileObj.getLong('size'));

			return fileId;
		}
		else
			throw new Error(`An unexpected error occurred while adding file '${fileObj.getUtfString('name')}' (target: ${parentId}).`);
	}

	_updateParentSize(parentItem, value)
	{
		parentItem.size += value;

		if (parentItem.parentId)
		{
			let grandParent = this._dataSource.get(parentItem.parentId);
			this._updateParentSize(grandParent, value);
		}
	}
}


/***/ }),

/***/ "./src/modules/base-module.js":
/*!************************************!*\
  !*** ./src/modules/base-module.js ***!
  \************************************/
/*! exports provided: BaseModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function($) {/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BaseModule", function() { return BaseModule; });
class BaseModule extends HTMLElement
{
	constructor(commandsPrefix)
	{
	    super();

		this._commandsPrefix = commandsPrefix;
	}

	get shellCtrl()
	{
		return this._shellCtrl;
	}

	get smartFox()
	{
		return this._shellCtrl.smartFox;
	}

	get idData()
	{
		return this._idData;
	}

	//---------------------------------
	// OVERRIDABLE METHODS
	//---------------------------------

	/**
	 * Called by the modules manager after loading the module.
	 * In case it is overridden, super must always be called!
	 */
	initialize(idData, shellController)
	{
		this._idData = idData;
		this._shellCtrl = shellController;

		// Add listener to Admin extension messages
		this.smartFox.addEventListener(SFS2X.SFSEvent.EXTENSION_RESPONSE, this._onExtensionResponse, this);
	}

	/**
	 * Called by the modules manager before unloading the module.
	 * In case it is overridden, super must always be called!
	 */
	destroy()
	{
		// Remove listener to Admin extension messages
		this.smartFox.removeEventListener(SFS2X.SFSEvent.EXTENSION_RESPONSE, this._onExtensionResponse);

		// Destroy all Kendo widgets
		kendo.destroy($('.module'));
	}

	/**
	 * Called by the onExtensionResponse listener below.
	 * Must be overridden.
	 */
	onExtensionCommand(cmd, data)
	{
		// Nothing to do
	}

	/**
	 * Called by the main shell whenever the server uptime changes.
	 * Can be overridden do display the uptime inside a module or make calculations on the server uptime.
	 */
	onUptimeUpdated(values)
	{
		// Nothing to do
	}

	//---------------------------------
	// PUBLIC METHODS
	//---------------------------------

	/**
	 * Send a request to Admin extension.
	 */
	sendExtensionRequest(command, data = null)
	{
		if (data == null)
			data = new SFS2X.SFSObject();

		this.smartFox.send(new SFS2X.ExtensionRequest(`${this._commandsPrefix}.${command}`, data));
	}

	//---------------------------------
	// PRIVATE METHODS
	//---------------------------------

	_onExtensionResponse(evtParams)
	{
		// Filter server responses
		let commands = evtParams.cmd.split('.');
		let data = evtParams.params;
		
		if (commands[0] == this._commandsPrefix)
		{
			if (commands.length > 1)
				this.onExtensionCommand(commands[1], data)
		}
	}
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ "jquery")))

/***/ }),

/***/ "./src/modules/extension-manager.js":
/*!******************************************!*\
  !*** ./src/modules/extension-manager.js ***!
  \******************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function($) {/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return ExtensionManager; });
/* harmony import */ var _base_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./base-module */ "./src/modules/base-module.js");
/* harmony import */ var _managers_file_datasource_manager__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../managers/file-datasource-manager */ "./src/managers/file-datasource-manager.js");
/* harmony import */ var _utils_utilities__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/utilities */ "./src/utils/utilities.js");




class ExtensionManager extends _base_module__WEBPACK_IMPORTED_MODULE_0__["BaseModule"]
{
	constructor()
	{
	    super('extensionMan');

		// Outgoing requests
		this.REQ_INIT = 'init';
		this.REQ_GET_EXTENSIONS = 'getExtensions';
		this.REQ_CREATE_FOLDER = 'createFolder';
		this.REQ_DELETE_FILES = 'deleteExtFiles';
		this.REQ_RELOAD_EXTENSIONS = 'reloadExt';

		// Incoming responses
		this.RESP_LOCKED = 'lock';
		this.RESP_INIT = 'init';
		this.RESP_EXTENSIONS = 'extensions';
		this.RESP_FILE_ADDED = 'fileAdded';
		this.RESP_FILES_DELETED = 'filesDeleted';
		this.RESP_ERROR = 'error';
	}

	//------------------------------------
	// COMMON MODULE INTERFACE METHODS
	// This members are used by the main controller
	// to communicate with the module's controller.
	//------------------------------------

	initialize(idData, shellController)
	{
		// Call super method
		super.initialize(idData, shellController);

		// Initialize progress bar
		$('#exm-progressBar').kendoProgressBar({
			min: 0,
            max: 100,
			value: false,
            type: 'value',
            animation: {
                duration: 400
            }
        });

		// Add listeners to buttons
		$('#exm-retryBt').on('click', $.proxy(this._onRetryClick, this));
		$('#exm-refreshBt').on('click', $.proxy(this._onRefreshClick, this));

		// Initialize files list
		this._filesList = $('#exm-fileList').kendoTreeList({
            dataSource: [],
			resizable: true,
			selectable: true,
            columns: [
                {
					field: 'name',
					title: 'Name',
					template: kendo.template(`
						<div >
							# if (isDir) { #
								# if (expanded) { #
									<i class="fas fa-folder-open"></i>
								# } else { #
									<i class="fas fa-folder"></i>
								# } #
							# } else { #
								<i class="far fa-file"></i>
							# } #

							#: name #

						</div>
						<div class="file-controls flex-grow-1 text-right" data-item-id="#:id#">
							# if (isDir) { #
								<button type="button" class="k-button k-primary my-1 create-folder-bt"><i class="fas fa-folder-plus"></i></button>
								# if (level > 0) { #
									<button type="button" class="k-button k-primary my-1 upload-files-bt"><i class="fas fa-file-upload"></i></button>
								# } #
							# } #

							# if (level > 0 && !isProtected) { #
								<button type="button" class="k-button k-primary my-1 remove-file-bt"><i class="fas fa-minus-circle"></i></button>
							# } #

							# if (level == 1 && !isLib) { #
								<button type="button" class="k-button k-primary my-1 reload-ext-bt"><i class="fas fa-redo-alt"></i></button>
							# } #
						</div>
					`),
				},
                {
					field: 'size',
					title: 'Size',
					template: function(dataItem) {
						dataItem.bytesToSize = _utils_utilities__WEBPACK_IMPORTED_MODULE_2__["bytesToSize"]; // Pass bytesToSize utility function to template
						return kendo.template(`
							#: bytesToSize(size, 2, 'KB') #
						`)(dataItem);
					},
					width: 120,
					minScreenWidth: 576
				},
                {
					field: 'lastMod',
					title: 'Last Modified',
					template: kendo.template(`
						#: kendo.toString(new Date(lastMod), 'dd MMM yyyy HH:mm:ss') #
					`),
					width: 200,
					minScreenWidth: 768
				},
            ],
			change: $.proxy(this._onFileSelectedChange, this)
        }).data('kendoTreeList');

		//-------------------------------------------

		// Add listeners to catch control button clicks on rows
		$('#exm-fileList').on('click', '.create-folder-bt', $.proxy(this._showAddFolderModalClick, this));
		$('#exm-fileList').on('click', '.upload-files-bt', $.proxy(this._showUploadFilesModalClick, this));
		$('#exm-fileList').on('click', '.remove-file-bt', $.proxy(this._onRemoveFileClick, this));
		$('#exm-fileList').on('click', '.reload-ext-bt', $.proxy(this._onReloadExtClick, this));

		//-------------------------------------------

		// Initialize "add folder" modal
		this._addFolderModal = $('#exm-addFolderModal');
		this._addFolderModal.modal({
			backdrop: 'static',
			keyboard: false,
			show: false
		});

		// Add listener to modal hide event
		this._addFolderModal.on('hidden.bs.modal', $.proxy(this._onAddFolderModalHidden, this));

		// Add listener to Add button click
		$('#exm-addFolderBt').on('click', $.proxy(this._onAddFolderClick, this));

		// Initialize kendo validation on folder name form
		this._addFolderValidator = $('#exm-addFolderForm').kendoValidator({}).data('kendoValidator');

		//-------------------------------------------

		// Initialize "upload files" modal
		this._uploadFilesModal = $('#exm-uploadModal');
		this._uploadFilesModal.modal({
			backdrop: 'static',
			keyboard: false,
			show: false
		});

		// Initialize kendo uploader
		this._uploader = $('#exm-uploader').kendoUpload({
			multiple: true,
			async: {
				saveUrl: 'http://localhost', // This will be changed later in _onUploadStart method
				autoUpload: true,
			},
			directoryDrop: true,
			upload: $.proxy(this._onUploadStart, this),
			complete: $.proxy(this._onUploadEnd, this),
			localization: {
				select: 'Select files...'
			}
		}).data('kendoUpload');

		// Add listener to Upload button click
		$('#exm-clearFilesBt').on('click', $.proxy(this._onClearFilesClick, this));

		//-------------------------------------------

		// Send initialization request
		this.sendExtensionRequest(this.REQ_INIT);
	}

	destroy()
	{
		// Call super method
		super.destroy();

		$('#exm-retryBt').off('click');
		$('#exm-refreshBt').off('click');

		$('#exm-fileList').off('click');

		this._addFolderModal.off('hidden.bs.modal');
		this._addFolderModal.modal('dispose');
		$('#exm-addFolderBt').off('click');

		this._uploadFilesModal.modal('dispose');
		$('#exm-clearFilesBt').off('click');
	}

	onExtensionCommand(command, data)
	{
		// Module can be enabled (no locking file exists)
		if (command == this.RESP_INIT)
		{
			// Retrieve file separator
			this._fileSeparator = data.getUtfString('sep');

			// Retrieve Extensions' __lib__ folder name
			const libFolder = data.getUtfString('lib');

			// Create file data source manager
			this._fileManager = new _managers_file_datasource_manager__WEBPACK_IMPORTED_MODULE_1__["FileDataSourceManager"](libFolder, [libFolder], this._fileSeparator);

			// Retrieve HTTP port to be used for files uploading
			const uploadHttpPort = data.getInt('httpPort');

			// Retrieve module id sent by the server (required because multiple modules use file uploading service)
			const uploadModuleId = data.getUtfString('modId');

			// Set file uploading target configuration
			this._uploadTargetConfig = {
				sessionToken: this.smartFox.sessionToken,
				host: this.smartFox.config.host,
				httpPort: uploadHttpPort,
				moduleId: uploadModuleId,
			};

			// Request Extension files data to server instance
			this._refreshDataList();
		}

		/*
		 * This response is returned if the file UploadsLock.txt exists in the /config folder of the server.
		 * This is an additional security measure to avoid unwanted files to be uploaded by malicius users accessing the server
		 * with the default credentials, in case they have not been changed by the administrator after the installation.
		 * The file must be removed manually before accessing the Extension Manager module for the first time
		 */
		else if (command == this.RESP_LOCKED)
		{
			// Show warning
			this._switchView('exm-locked');
		}

		// Extensions folders and files
		else if (command == this.RESP_EXTENSIONS)
		{
			// Retrieve Extension file list
			let extensionsObj = data.getSFSObject('extensions');

			// Initialize manager
			this._fileManager.init();

			// Add list to manager
			this._fileManager.addFile(extensionsObj);

			// Set TreeList data source
			this._filesList.setDataSource(this._fileManager.dataSource);

			// Expand first level
			this._filesList.expand($('#exm-fileList tbody>tr:eq(0)'));

			// Enable interface
			this._enableInterface(true);

			// Show module's main view
			this._switchView('exm-main');
		}

		// An error occurred while managing extension files
		else if (command == this.RESP_ERROR)
		{
			// Hide add folder modal
			this._addFolderModal.modal('hide');

			// Re-enable interface
			this._enableInterface(true);

			// Show an alert
			this.shellCtrl.showSimpleAlert(data.getUtfString('error'));
		}

		// Extension folder or file added
		else if (command == this.RESP_FILE_ADDED)
		{
			// Get name of the user who added the file/folder
			const requester = data.getUtfString('user');

			// Get the object representing the file/folder being added
			const fileObj = data.getSFSObject('file');

			// Get the target folder where the new file/folder should be added
			const parentPath = data.getUtfString('parent');

			// Get the flag notifying this was a file upload
			const isUpload = data.getBool('isUpload');

			try
			{
				// Add/update item on data source
				const filePath = this._fileManager.addFileToParent(fileObj, parentPath);

				// Refresh view
				this._filesList.refresh();

				if (requester == this.smartFox.mySelf.name)
				{
					// Expand parent
					this._filesList.expand($(`#exm-fileList .file-controls[data-item-id="${parentPath}"]`).closest('tr'));

					if (!isUpload)
					{
						// Hide modal
						this._addFolderModal.modal('hide');

						// Select upload file
						this._filesList.select($(`#exm-fileList .file-controls[data-item-id="${filePath}"]`).closest('tr'));
					}

					// Update selection
					this._onFileSelectedChange();
				}
				else
				{
					// Display notification
					if (!isUpload)
						this.shellCtrl.showNotification(`Folder created`, `Administrator ${requester} created folder: <strong>${filePath}</strong>`);
					else
						this.shellCtrl.showNotification(`File uploaded`, `Administrator ${requester} uploaded file: <strong>${filePath}</strong>`);
				}
			}
			catch (e)
			{
				// This should not happen... data source is corrupted?
				if (requester == this.smartFox.mySelf.name)
					this.shellCtrl.showSimpleAlert(e.message, true);
			}

			// Enable interface
			this._enableInterface(true);
		}

		// Extension files deleted
		else if (command == this.RESP_FILES_DELETED)
		{
			// Get name of the user who deleted the file/s
			const requester = data.getUtfString('user');

			// Get the list of deleted files
			let files = data.getSFSArray('files');

			let filesArr = [];

			// Update data source
			for (let j = 0; j < files.size(); j++)
			{
				let path = files.getUtfString(j);
				filesArr.push(path);

				//------------------------

				// Remove item from data source; parent item is returned
				let parentItem = this._fileManager.removeFile(path);

				// Collapse parent if the last of its children was deleted
				if (parentItem && !parentItem.hasChildren)
					this._filesList.collapse($(`#exm-fileList .file-controls[data-item-id="${parentItem.id}"]`).closest('tr'));
			}

			if (requester == this.smartFox.mySelf.name)
			{
				// Display notification
				this.shellCtrl.showNotification(`${this._selectedItem.isDir ? 'Folder' : 'File'} deleted`, `${this._selectedItem.isDir ? 'Folder' : 'File'} '${this._selectedItem.name}' deleted successfully`);

				this._selectedItem = null;

				this._enableInterface(true);
			}
			else
			{
				// Display notification
				this.shellCtrl.showNotification(`File deleted`, `Administrator ${requester} deleted the following file${filesArr.length > 1 ? 's' : ''}: <strong>${filesArr.join('<br> ')}</strong>`);
			}

			// Reset selection
			this._onFileSelectedChange();
		}

		// else if ()
	}

	//---------------------------------
	// UI EVENT LISTENERS
	//---------------------------------

	_onRetryClick()
	{
		this._switchView('exm-init');

		// Re-send initialization request
		this.sendExtensionRequest(this.REQ_INIT);
	}

	_onRefreshClick()
	{
		this._filesList.clearSelection();
		this._refreshDataList();
	}

	_onFileSelectedChange()
	{
		// Hide control buttons on currently selected item
		if (this._selectedItem)
			$(`#exm-fileList .file-controls[data-item-id="${this._selectedItem.id}"]`).hide();

		// Get selected item
		let selectedRows = this._filesList.select();

		if (selectedRows.length > 0)
		{
			// Save ref. to selected item
			this._selectedItem = this._filesList.dataItem(selectedRows[0]);

			// Show control buttons on new selected item
			$(`#exm-fileList .file-controls[data-item-id="${this._selectedItem.id}"]`).show();
		}
		else
			this._selectedItem = null;
	}

	_showAddFolderModalClick()
	{
		if (this._selectedItem && this._selectedItem.isDir)
		{
			this._addFolderModal.modal('show');
			$('#exm-folderNameIn').focus();
		}
	}

	_onAddFolderClick()
	{
		// The parent folder could have been deleted while user is still typing the name of the new child folder
		if (!this._selectedItem)
		{
			this._addFolderModal.modal('hide');
			this.shellCtrl.showSimpleAlert('Unable to create folder; the parent folder doesn\'t exist.');
			return;
		}

		if (this._addFolderValidator.validate())
		{
			// Disable modal interface
			this._enableAddFolderModal(false);

			let data = new SFS2X.SFSObject();
			data.putUtfString('folder', this._selectedItem.id + this._fileSeparator + $('#exm-folderNameIn').val());

			// Send request to server
			this.sendExtensionRequest(this.REQ_CREATE_FOLDER, data);
		}
	}

	_onAddFolderModalHidden()
	{
		$('#exm-folderNameIn').val('');
		this._resetAddFolderValidation();

		// Enable modal interface
		this._enableAddFolderModal(true);
	}

	_showUploadFilesModalClick()
	{
		if (this._selectedItem)
			this._uploadFilesModal.modal('show');
	}

	_onClearFilesClick()
	{
		this._uploader.clearAllFiles();
	}

	_onUploadStart(e)
	{
		// Disable clear button
		$('#exm-clearFilesBt').attr('disabled', true);

		// Set destination url
		const url = 'http://' + this._uploadTargetConfig.host + ':' + this._uploadTargetConfig.httpPort + '/BlueBox/SFS2XFileUpload?sessHashId=' + this._uploadTargetConfig.sessionToken;

		e.sender.options.async.saveUrl = url;

		// Set payload
		const params = new FormData();
		params.append('__module', this._uploadTargetConfig.moduleId);
		params.append('__target', this._selectedItem.id);

		for (let f = 0; f < e.files.length; f++)
			params.append('files[]', e.files[f].rawFile);

		e.formData = params;
	}

	_onUploadEnd(e)
	{
		// Enable clear button
		$('#exm-clearFilesBt').attr('disabled', false);
	}

	_onFilesUploadEnd(response)
	{
		// Nothing to do: we have to wait the upload process completion to be signaled by the server through the dedicated Extension response

		//=================================================================

		// TODO Should we handle this response in some way? For some unknown reason we always get ok=false and status=0
		// console.log(response)
		// console.log(response.ok)
		// console.log(response.status)
	}

	_onRemoveFileClick()
	{
		if (this._selectedItem)
			this.shellCtrl.showConfirmWarning(`Are you sure you want to delete the selected ${this._selectedItem.isDir ? 'folder' : 'file'}?<br><br>Path: <strong>${this._selectedItem.id}</strong>`, $.proxy(this._onRemoveFileConfirm, this));
	}

	_onRemoveFileConfirm()
	{
		// Disable interface
		this._enableInterface(false);

		// Request Extension files removal
		// NOTE: for compatibility with older AdminTool, the file to be deleted is sent
		// in an array of strings, even if we can't delete more than 1 file at once in this AdminTool

		let files = new SFS2X.SFSArray();
		files.addUtfString(this._selectedItem.id);

		let params = new SFS2X.SFSObject();
		params.putSFSArray('files', files);

		this.sendExtensionRequest(this.REQ_DELETE_FILES, params);
	}

	_onReloadExtClick()
	{
		if (this._selectedItem)
		{
			let pathArr = this._selectedItem.id.split(this._fileSeparator);

			if (pathArr.length > 1)
			{
				// Request Extension reload
				// NOTE: for compatibility with older AdminTool, the Extension to be reloaded is sent
				// in an array of strings, even if we can't reload more than 1 Extension at once in this AdminTool

				let extToReload = [];
				extToReload.push(pathArr[1]);

				let params = new SFS2X.SFSObject();
				params.putUtfStringArray('extensions', extToReload);

				// Send request to server
				this.sendExtensionRequest(this.REQ_RELOAD_EXTENSIONS, params);
			}
		}
	}

	//------------------------------------
	// PRIVATE METHODS
	//------------------------------------

	_switchView(viewId)
	{
		document.getElementById('exm-viewstack').selectedElement = document.getElementById(viewId);
	}

	_enableInterface(enable)
	{
		$('#exm-fileList').attr('disabled', !enable);
		$('#exm-refreshBt').attr('disabled', !enable);
	}

	_refreshDataList()
	{
		// Disable interface
		this._enableInterface(false);

		// Send request to server
		this.sendExtensionRequest(this.REQ_GET_EXTENSIONS)
	}

	_resetAddFolderValidation()
	{
		this._addFolderValidator.hideMessages();

		// The method above doesn't remove the k-invalid classes and aria-invalid="true" attributes from inputs
		// Let's do it manually
		$('#exm-addFolderForm .k-invalid').removeClass('k-invalid');
		$('#exm-addFolderForm [aria-invalid="true"]').removeAttr('aria-invalid');
	}

	_enableAddFolderModal(enable)
	{
		// Disable modal close buttons
		$('#exm-addFolderModal button[data-dismiss="modal"]').attr('disabled', !enable);

		// Disable add button
		$('#exm-addFolderBt').attr('disabled', !enable);

		// Disable fieldset
		$('#exm-addFolderForm').attr('disabled', !enable);
	}

	//---------------------------------
	// PRIVATE GETTERS
	//---------------------------------


}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ "jquery")))

/***/ })

}]);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzL2pzL2NvcmUvbW9kdWxlcy9tb2R1bGUtNi5idW5kbGUuanMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9hcHBsaWNhdGlvbi8uL3NyYy9tYW5hZ2Vycy9maWxlLWRhdGFzb3VyY2UtbWFuYWdlci5qcyIsIndlYnBhY2s6Ly9hcHBsaWNhdGlvbi8uL3NyYy9tb2R1bGVzL2Jhc2UtbW9kdWxlLmpzIiwid2VicGFjazovL2FwcGxpY2F0aW9uLy4vc3JjL21vZHVsZXMvZXh0ZW5zaW9uLW1hbmFnZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNsYXNzIEZpbGVEYXRhU291cmNlTWFuYWdlclxue1xuXHRjb25zdHJ1Y3RvcihsaWJGb2xkZXIsIHByb3RlY3RlZEZvbGRlcnMsIGZpbGVTZXBhcmF0b3IpXG5cdHtcblx0XHR0aGlzLl9wcm90ZWN0ZWRGb2xkZXJzID0gcHJvdGVjdGVkRm9sZGVyczsgLy8gRm9sZGVycyB3aGljaCBjYW4ndCBiZSBkZWxldGVkIChidXQgdGhlaXIgY29udGVudCBjYW4pXG5cdFx0dGhpcy5fbGliRm9sZGVyID0gbGliRm9sZGVyO1xuXHRcdHRoaXMuX2ZpbGVTZXBhcmF0b3IgPSBmaWxlU2VwYXJhdG9yO1xuXHR9XG5cblx0Z2V0IGRhdGFTb3VyY2UoKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuX2RhdGFTb3VyY2U7XG5cdH1cblxuXHRpbml0KClcblx0e1xuXHRcdHRoaXMuX2RhdGFTb3VyY2UgPSBuZXcga2VuZG8uZGF0YS5UcmVlTGlzdERhdGFTb3VyY2Uoe1xuXHRcdFx0ZGF0YTogW10sXG5cdFx0XHRzY2hlbWE6IHtcblx0XHRcdFx0bW9kZWw6IHtcblx0XHRcdFx0XHRpZDogJ2lkJyxcblx0XHRcdFx0XHRwYXJlbnRJZDogJ3BhcmVudElkJyxcblx0XHRcdFx0XHRleHBhbmRlZDogZmFsc2Vcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHNvcnQ6IHsgZmllbGQ6ICduYW1lJywgZGlyOiAnYXNjJyB9XG5cdFx0fSk7XG5cdH1cblxuXHRhZGRGaWxlKGZpbGVPYmosIHBhcmVudExldmVsID0gbnVsbClcblx0e1xuXHRcdGxldCBmaWxlID0ge307XG5cblx0XHRmaWxlLm5hbWUgPSBmaWxlT2JqLmdldFV0ZlN0cmluZygnbmFtZScpO1xuXHRcdGZpbGUuaXNEaXIgPSBmaWxlT2JqLmdldEJvb2woJ2lzRGlyJyk7XG5cdFx0ZmlsZS5sYXN0TW9kID0gZmlsZU9iai5nZXRMb25nKCdsYXN0TW9kJyk7XG5cdFx0ZmlsZS5pc0xpYiA9IChmaWxlLmlzRGlyICYmIGZpbGUubmFtZSA9PSB0aGlzLl9saWJGb2xkZXIpO1xuXHRcdGZpbGUuaXNQcm90ZWN0ZWQgPSAoZmlsZS5pc0RpciAmJiB0aGlzLl9wcm90ZWN0ZWRGb2xkZXJzLmluZGV4T2YoZmlsZS5uYW1lKSA+IC0xKTtcblx0XHRmaWxlLnNpemUgPSAwO1xuXG5cdFx0aWYgKHBhcmVudExldmVsID09IG51bGwpXG5cdFx0XHRmaWxlLmxldmVsID0gMDtcblx0XHRlbHNlXG5cdFx0XHRmaWxlLmxldmVsID0gcGFyZW50TGV2ZWwgKyAxO1xuXG5cdFx0aWYgKGZpbGVPYmouY29udGFpbnNLZXkoJ3BhcmVudCcpKVxuXHRcdHtcblx0XHRcdGZpbGUucGFyZW50SWQgPSBmaWxlT2JqLmdldFV0ZlN0cmluZygncGFyZW50Jyk7XG5cdFx0XHRmaWxlLmlkID0gZmlsZS5wYXJlbnRJZCArIHRoaXMuX2ZpbGVTZXBhcmF0b3IgKyBmaWxlLm5hbWU7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHR7XG5cdFx0XHRmaWxlLnBhcmVudElkID0gbnVsbDtcblx0XHRcdGZpbGUuaWQgPSBmaWxlLm5hbWU7XG5cdFx0fVxuXG5cdFx0Ly8gQWRkIGNoaWxkIGZpbGVzXG5cdFx0aWYgKGZpbGUuaXNEaXIpXG5cdFx0e1xuXHRcdFx0bGV0IGZpbGVzQXJyID0gZmlsZU9iai5nZXRTRlNBcnJheSgnZmlsZXMnKTtcblxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBmaWxlc0Fyci5zaXplKCk7IGkrKylcblx0XHRcdFx0ZmlsZS5zaXplICs9IHRoaXMuYWRkRmlsZShmaWxlc0Fyci5nZXRTRlNPYmplY3QoaSksIGZpbGUubGV2ZWwpO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0XHRmaWxlLnNpemUgPSBmaWxlT2JqLmdldExvbmcoJ3NpemUnKTtcblxuXHRcdC8vIEFkZCBmaWxlIHRvIGRhdGEgc291cmNlXG5cdFx0dGhpcy5fZGF0YVNvdXJjZS5hZGQoZmlsZSk7XG5cblx0XHQvLyBSZXR1cm4gZmlsZSBzaXplXG5cdFx0cmV0dXJuIGZpbGUuc2l6ZTtcblx0fVxuXG5cdHJlbW92ZUZpbGUoaWQpXG5cdHtcblx0XHRsZXQgZmlsZUl0ZW0gPSB0aGlzLl9kYXRhU291cmNlLmdldChpZCk7XG5cblx0XHRpZiAoZmlsZUl0ZW0pXG5cdFx0e1xuXHRcdFx0aWYgKGZpbGVJdGVtLnBhcmVudElkKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBTdWJ0cmFjdCBvbGQgc2l6ZSBmcm9tIHBhcmVudCBzaXplXG5cdFx0XHRcdGxldCBwYXJlbnRJdGVtID0gdGhpcy5fZGF0YVNvdXJjZS5nZXQoZmlsZUl0ZW0ucGFyZW50SWQpO1xuXHRcdFx0XHR0aGlzLl91cGRhdGVQYXJlbnRTaXplKHBhcmVudEl0ZW0sIC1maWxlSXRlbS5zaXplKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fZGF0YVNvdXJjZS5yZW1vdmUoZmlsZUl0ZW0pO1xuXG5cdFx0XHQvLyBSZXR1cm4gcGFyZW50IGl0ZW1cblx0XHRcdGlmIChmaWxlSXRlbS5wYXJlbnRJZClcblx0XHRcdFx0cmV0dXJuIHRoaXMuX2RhdGFTb3VyY2UuZ2V0KGZpbGVJdGVtLnBhcmVudElkKTtcblx0XHR9XG5cdH1cblxuXHRnZXRGaWxlQnlJZChpZClcblx0e1xuXHRcdHJldHVybiB0aGlzLl9kYXRhU291cmNlLmdldChpZCk7XG5cdH1cblxuXHRhZGRGaWxlVG9QYXJlbnQoZmlsZU9iaiwgcGFyZW50SWQpXG5cdHtcblx0XHRsZXQgcGFyZW50SXRlbSA9IHRoaXMuX2RhdGFTb3VyY2UuZ2V0KHBhcmVudElkKTtcblxuXHRcdGlmIChwYXJlbnRJdGVtICE9IG51bGwgJiYgcGFyZW50SXRlbS5pc0Rpcilcblx0XHR7XG5cdFx0XHRjb25zdCBmaWxlSWQgPSBwYXJlbnRJZCArIHRoaXMuX2ZpbGVTZXBhcmF0b3IgKyBmaWxlT2JqLmdldFV0ZlN0cmluZygnbmFtZScpO1xuXHRcdFx0bGV0IGZpbGVJdGVtID0gdGhpcy5fZGF0YVNvdXJjZS5nZXQoZmlsZUlkKTtcblxuXHRcdFx0aWYgKGZpbGVJdGVtICE9IG51bGwpXG5cdFx0XHR7XG5cdFx0XHRcdC8vIFN1YnRyYWN0IG9sZCBzaXplIGZyb20gcGFyZW50IHNpemVcblx0XHRcdFx0dGhpcy5fdXBkYXRlUGFyZW50U2l6ZShwYXJlbnRJdGVtLCAtZmlsZUl0ZW0uc2l6ZSk7XG5cblx0XHRcdFx0Ly8gVXBkYXRlIGV4aXN0aW5nIGl0ZW1cblx0XHRcdFx0ZmlsZUl0ZW0ubmFtZSA9IGZpbGVPYmouZ2V0VXRmU3RyaW5nKCduYW1lJyk7XG5cdFx0XHRcdGZpbGVJdGVtLmxhc3RNb2QgPSBmaWxlT2JqLmdldExvbmcoJ2xhc3RNb2QnKTtcblx0XHRcdFx0ZmlsZUl0ZW0uc2l6ZSA9IGZpbGVPYmouZ2V0TG9uZygnc2l6ZScpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBBZGQgbmV3IGl0ZW1cblx0XHRcdFx0dGhpcy5hZGRGaWxlKGZpbGVPYmosIHBhcmVudEl0ZW0ubGV2ZWwpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBVcGRhdGUgcGFyZW50IGl0ZW0gc2l6ZVxuXHRcdFx0dGhpcy5fdXBkYXRlUGFyZW50U2l6ZShwYXJlbnRJdGVtLCBmaWxlT2JqLmdldExvbmcoJ3NpemUnKSk7XG5cblx0XHRcdHJldHVybiBmaWxlSWQ7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHRcdHRocm93IG5ldyBFcnJvcihgQW4gdW5leHBlY3RlZCBlcnJvciBvY2N1cnJlZCB3aGlsZSBhZGRpbmcgZmlsZSAnJHtmaWxlT2JqLmdldFV0ZlN0cmluZygnbmFtZScpfScgKHRhcmdldDogJHtwYXJlbnRJZH0pLmApO1xuXHR9XG5cblx0X3VwZGF0ZVBhcmVudFNpemUocGFyZW50SXRlbSwgdmFsdWUpXG5cdHtcblx0XHRwYXJlbnRJdGVtLnNpemUgKz0gdmFsdWU7XG5cblx0XHRpZiAocGFyZW50SXRlbS5wYXJlbnRJZClcblx0XHR7XG5cdFx0XHRsZXQgZ3JhbmRQYXJlbnQgPSB0aGlzLl9kYXRhU291cmNlLmdldChwYXJlbnRJdGVtLnBhcmVudElkKTtcblx0XHRcdHRoaXMuX3VwZGF0ZVBhcmVudFNpemUoZ3JhbmRQYXJlbnQsIHZhbHVlKTtcblx0XHR9XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBCYXNlTW9kdWxlIGV4dGVuZHMgSFRNTEVsZW1lbnRcbntcblx0Y29uc3RydWN0b3IoY29tbWFuZHNQcmVmaXgpXG5cdHtcblx0ICAgIHN1cGVyKCk7XG5cblx0XHR0aGlzLl9jb21tYW5kc1ByZWZpeCA9IGNvbW1hbmRzUHJlZml4O1xuXHR9XG5cblx0Z2V0IHNoZWxsQ3RybCgpXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5fc2hlbGxDdHJsO1xuXHR9XG5cblx0Z2V0IHNtYXJ0Rm94KClcblx0e1xuXHRcdHJldHVybiB0aGlzLl9zaGVsbEN0cmwuc21hcnRGb3g7XG5cdH1cblxuXHRnZXQgaWREYXRhKClcblx0e1xuXHRcdHJldHVybiB0aGlzLl9pZERhdGE7XG5cdH1cblxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQvLyBPVkVSUklEQUJMRSBNRVRIT0RTXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0LyoqXG5cdCAqIENhbGxlZCBieSB0aGUgbW9kdWxlcyBtYW5hZ2VyIGFmdGVyIGxvYWRpbmcgdGhlIG1vZHVsZS5cblx0ICogSW4gY2FzZSBpdCBpcyBvdmVycmlkZGVuLCBzdXBlciBtdXN0IGFsd2F5cyBiZSBjYWxsZWQhXG5cdCAqL1xuXHRpbml0aWFsaXplKGlkRGF0YSwgc2hlbGxDb250cm9sbGVyKVxuXHR7XG5cdFx0dGhpcy5faWREYXRhID0gaWREYXRhO1xuXHRcdHRoaXMuX3NoZWxsQ3RybCA9IHNoZWxsQ29udHJvbGxlcjtcblxuXHRcdC8vIEFkZCBsaXN0ZW5lciB0byBBZG1pbiBleHRlbnNpb24gbWVzc2FnZXNcblx0XHR0aGlzLnNtYXJ0Rm94LmFkZEV2ZW50TGlzdGVuZXIoU0ZTMlguU0ZTRXZlbnQuRVhURU5TSU9OX1JFU1BPTlNFLCB0aGlzLl9vbkV4dGVuc2lvblJlc3BvbnNlLCB0aGlzKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDYWxsZWQgYnkgdGhlIG1vZHVsZXMgbWFuYWdlciBiZWZvcmUgdW5sb2FkaW5nIHRoZSBtb2R1bGUuXG5cdCAqIEluIGNhc2UgaXQgaXMgb3ZlcnJpZGRlbiwgc3VwZXIgbXVzdCBhbHdheXMgYmUgY2FsbGVkIVxuXHQgKi9cblx0ZGVzdHJveSgpXG5cdHtcblx0XHQvLyBSZW1vdmUgbGlzdGVuZXIgdG8gQWRtaW4gZXh0ZW5zaW9uIG1lc3NhZ2VzXG5cdFx0dGhpcy5zbWFydEZveC5yZW1vdmVFdmVudExpc3RlbmVyKFNGUzJYLlNGU0V2ZW50LkVYVEVOU0lPTl9SRVNQT05TRSwgdGhpcy5fb25FeHRlbnNpb25SZXNwb25zZSk7XG5cblx0XHQvLyBEZXN0cm95IGFsbCBLZW5kbyB3aWRnZXRzXG5cdFx0a2VuZG8uZGVzdHJveSgkKCcubW9kdWxlJykpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENhbGxlZCBieSB0aGUgb25FeHRlbnNpb25SZXNwb25zZSBsaXN0ZW5lciBiZWxvdy5cblx0ICogTXVzdCBiZSBvdmVycmlkZGVuLlxuXHQgKi9cblx0b25FeHRlbnNpb25Db21tYW5kKGNtZCwgZGF0YSlcblx0e1xuXHRcdC8vIE5vdGhpbmcgdG8gZG9cblx0fVxuXG5cdC8qKlxuXHQgKiBDYWxsZWQgYnkgdGhlIG1haW4gc2hlbGwgd2hlbmV2ZXIgdGhlIHNlcnZlciB1cHRpbWUgY2hhbmdlcy5cblx0ICogQ2FuIGJlIG92ZXJyaWRkZW4gZG8gZGlzcGxheSB0aGUgdXB0aW1lIGluc2lkZSBhIG1vZHVsZSBvciBtYWtlIGNhbGN1bGF0aW9ucyBvbiB0aGUgc2VydmVyIHVwdGltZS5cblx0ICovXG5cdG9uVXB0aW1lVXBkYXRlZCh2YWx1ZXMpXG5cdHtcblx0XHQvLyBOb3RoaW5nIHRvIGRvXG5cdH1cblxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQvLyBQVUJMSUMgTUVUSE9EU1xuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdC8qKlxuXHQgKiBTZW5kIGEgcmVxdWVzdCB0byBBZG1pbiBleHRlbnNpb24uXG5cdCAqL1xuXHRzZW5kRXh0ZW5zaW9uUmVxdWVzdChjb21tYW5kLCBkYXRhID0gbnVsbClcblx0e1xuXHRcdGlmIChkYXRhID09IG51bGwpXG5cdFx0XHRkYXRhID0gbmV3IFNGUzJYLlNGU09iamVjdCgpO1xuXG5cdFx0dGhpcy5zbWFydEZveC5zZW5kKG5ldyBTRlMyWC5FeHRlbnNpb25SZXF1ZXN0KGAke3RoaXMuX2NvbW1hbmRzUHJlZml4fS4ke2NvbW1hbmR9YCwgZGF0YSkpO1xuXHR9XG5cblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0Ly8gUFJJVkFURSBNRVRIT0RTXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0X29uRXh0ZW5zaW9uUmVzcG9uc2UoZXZ0UGFyYW1zKVxuXHR7XG5cdFx0Ly8gRmlsdGVyIHNlcnZlciByZXNwb25zZXNcblx0XHRsZXQgY29tbWFuZHMgPSBldnRQYXJhbXMuY21kLnNwbGl0KCcuJyk7XG5cdFx0bGV0IGRhdGEgPSBldnRQYXJhbXMucGFyYW1zO1xuXHRcdFxuXHRcdGlmIChjb21tYW5kc1swXSA9PSB0aGlzLl9jb21tYW5kc1ByZWZpeClcblx0XHR7XG5cdFx0XHRpZiAoY29tbWFuZHMubGVuZ3RoID4gMSlcblx0XHRcdFx0dGhpcy5vbkV4dGVuc2lvbkNvbW1hbmQoY29tbWFuZHNbMV0sIGRhdGEpXG5cdFx0fVxuXHR9XG59XG4iLCJpbXBvcnQge0Jhc2VNb2R1bGV9IGZyb20gJy4vYmFzZS1tb2R1bGUnO1xuaW1wb3J0IHtGaWxlRGF0YVNvdXJjZU1hbmFnZXJ9IGZyb20gJy4uL21hbmFnZXJzL2ZpbGUtZGF0YXNvdXJjZS1tYW5hZ2VyJztcbmltcG9ydCB7Ynl0ZXNUb1NpemV9IGZyb20gJy4uL3V0aWxzL3V0aWxpdGllcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEV4dGVuc2lvbk1hbmFnZXIgZXh0ZW5kcyBCYXNlTW9kdWxlXG57XG5cdGNvbnN0cnVjdG9yKClcblx0e1xuXHQgICAgc3VwZXIoJ2V4dGVuc2lvbk1hbicpO1xuXG5cdFx0Ly8gT3V0Z29pbmcgcmVxdWVzdHNcblx0XHR0aGlzLlJFUV9JTklUID0gJ2luaXQnO1xuXHRcdHRoaXMuUkVRX0dFVF9FWFRFTlNJT05TID0gJ2dldEV4dGVuc2lvbnMnO1xuXHRcdHRoaXMuUkVRX0NSRUFURV9GT0xERVIgPSAnY3JlYXRlRm9sZGVyJztcblx0XHR0aGlzLlJFUV9ERUxFVEVfRklMRVMgPSAnZGVsZXRlRXh0RmlsZXMnO1xuXHRcdHRoaXMuUkVRX1JFTE9BRF9FWFRFTlNJT05TID0gJ3JlbG9hZEV4dCc7XG5cblx0XHQvLyBJbmNvbWluZyByZXNwb25zZXNcblx0XHR0aGlzLlJFU1BfTE9DS0VEID0gJ2xvY2snO1xuXHRcdHRoaXMuUkVTUF9JTklUID0gJ2luaXQnO1xuXHRcdHRoaXMuUkVTUF9FWFRFTlNJT05TID0gJ2V4dGVuc2lvbnMnO1xuXHRcdHRoaXMuUkVTUF9GSUxFX0FEREVEID0gJ2ZpbGVBZGRlZCc7XG5cdFx0dGhpcy5SRVNQX0ZJTEVTX0RFTEVURUQgPSAnZmlsZXNEZWxldGVkJztcblx0XHR0aGlzLlJFU1BfRVJST1IgPSAnZXJyb3InO1xuXHR9XG5cblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0Ly8gQ09NTU9OIE1PRFVMRSBJTlRFUkZBQ0UgTUVUSE9EU1xuXHQvLyBUaGlzIG1lbWJlcnMgYXJlIHVzZWQgYnkgdGhlIG1haW4gY29udHJvbGxlclxuXHQvLyB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSBtb2R1bGUncyBjb250cm9sbGVyLlxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdGluaXRpYWxpemUoaWREYXRhLCBzaGVsbENvbnRyb2xsZXIpXG5cdHtcblx0XHQvLyBDYWxsIHN1cGVyIG1ldGhvZFxuXHRcdHN1cGVyLmluaXRpYWxpemUoaWREYXRhLCBzaGVsbENvbnRyb2xsZXIpO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSBwcm9ncmVzcyBiYXJcblx0XHQkKCcjZXhtLXByb2dyZXNzQmFyJykua2VuZG9Qcm9ncmVzc0Jhcih7XG5cdFx0XHRtaW46IDAsXG4gICAgICAgICAgICBtYXg6IDEwMCxcblx0XHRcdHZhbHVlOiBmYWxzZSxcbiAgICAgICAgICAgIHR5cGU6ICd2YWx1ZScsXG4gICAgICAgICAgICBhbmltYXRpb246IHtcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogNDAwXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG5cdFx0Ly8gQWRkIGxpc3RlbmVycyB0byBidXR0b25zXG5cdFx0JCgnI2V4bS1yZXRyeUJ0Jykub24oJ2NsaWNrJywgJC5wcm94eSh0aGlzLl9vblJldHJ5Q2xpY2ssIHRoaXMpKTtcblx0XHQkKCcjZXhtLXJlZnJlc2hCdCcpLm9uKCdjbGljaycsICQucHJveHkodGhpcy5fb25SZWZyZXNoQ2xpY2ssIHRoaXMpKTtcblxuXHRcdC8vIEluaXRpYWxpemUgZmlsZXMgbGlzdFxuXHRcdHRoaXMuX2ZpbGVzTGlzdCA9ICQoJyNleG0tZmlsZUxpc3QnKS5rZW5kb1RyZWVMaXN0KHtcbiAgICAgICAgICAgIGRhdGFTb3VyY2U6IFtdLFxuXHRcdFx0cmVzaXphYmxlOiB0cnVlLFxuXHRcdFx0c2VsZWN0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7XG5cdFx0XHRcdFx0ZmllbGQ6ICduYW1lJyxcblx0XHRcdFx0XHR0aXRsZTogJ05hbWUnLFxuXHRcdFx0XHRcdHRlbXBsYXRlOiBrZW5kby50ZW1wbGF0ZShgXG5cdFx0XHRcdFx0XHQ8ZGl2ID5cblx0XHRcdFx0XHRcdFx0IyBpZiAoaXNEaXIpIHsgI1xuXHRcdFx0XHRcdFx0XHRcdCMgaWYgKGV4cGFuZGVkKSB7ICNcblx0XHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwiZmFzIGZhLWZvbGRlci1vcGVuXCI+PC9pPlxuXHRcdFx0XHRcdFx0XHRcdCMgfSBlbHNlIHsgI1xuXHRcdFx0XHRcdFx0XHRcdFx0PGkgY2xhc3M9XCJmYXMgZmEtZm9sZGVyXCI+PC9pPlxuXHRcdFx0XHRcdFx0XHRcdCMgfSAjXG5cdFx0XHRcdFx0XHRcdCMgfSBlbHNlIHsgI1xuXHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwiZmFyIGZhLWZpbGVcIj48L2k+XG5cdFx0XHRcdFx0XHRcdCMgfSAjXG5cblx0XHRcdFx0XHRcdFx0IzogbmFtZSAjXG5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImZpbGUtY29udHJvbHMgZmxleC1ncm93LTEgdGV4dC1yaWdodFwiIGRhdGEtaXRlbS1pZD1cIiM6aWQjXCI+XG5cdFx0XHRcdFx0XHRcdCMgaWYgKGlzRGlyKSB7ICNcblx0XHRcdFx0XHRcdFx0XHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImstYnV0dG9uIGstcHJpbWFyeSBteS0xIGNyZWF0ZS1mb2xkZXItYnRcIj48aSBjbGFzcz1cImZhcyBmYS1mb2xkZXItcGx1c1wiPjwvaT48L2J1dHRvbj5cblx0XHRcdFx0XHRcdFx0XHQjIGlmIChsZXZlbCA+IDApIHsgI1xuXHRcdFx0XHRcdFx0XHRcdFx0PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJrLWJ1dHRvbiBrLXByaW1hcnkgbXktMSB1cGxvYWQtZmlsZXMtYnRcIj48aSBjbGFzcz1cImZhcyBmYS1maWxlLXVwbG9hZFwiPjwvaT48L2J1dHRvbj5cblx0XHRcdFx0XHRcdFx0XHQjIH0gI1xuXHRcdFx0XHRcdFx0XHQjIH0gI1xuXG5cdFx0XHRcdFx0XHRcdCMgaWYgKGxldmVsID4gMCAmJiAhaXNQcm90ZWN0ZWQpIHsgI1xuXHRcdFx0XHRcdFx0XHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiay1idXR0b24gay1wcmltYXJ5IG15LTEgcmVtb3ZlLWZpbGUtYnRcIj48aSBjbGFzcz1cImZhcyBmYS1taW51cy1jaXJjbGVcIj48L2k+PC9idXR0b24+XG5cdFx0XHRcdFx0XHRcdCMgfSAjXG5cblx0XHRcdFx0XHRcdFx0IyBpZiAobGV2ZWwgPT0gMSAmJiAhaXNMaWIpIHsgI1xuXHRcdFx0XHRcdFx0XHRcdDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiay1idXR0b24gay1wcmltYXJ5IG15LTEgcmVsb2FkLWV4dC1idFwiPjxpIGNsYXNzPVwiZmFzIGZhLXJlZG8tYWx0XCI+PC9pPjwvYnV0dG9uPlxuXHRcdFx0XHRcdFx0XHQjIH0gI1xuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0YCksXG5cdFx0XHRcdH0sXG4gICAgICAgICAgICAgICAge1xuXHRcdFx0XHRcdGZpZWxkOiAnc2l6ZScsXG5cdFx0XHRcdFx0dGl0bGU6ICdTaXplJyxcblx0XHRcdFx0XHR0ZW1wbGF0ZTogZnVuY3Rpb24oZGF0YUl0ZW0pIHtcblx0XHRcdFx0XHRcdGRhdGFJdGVtLmJ5dGVzVG9TaXplID0gYnl0ZXNUb1NpemU7IC8vIFBhc3MgYnl0ZXNUb1NpemUgdXRpbGl0eSBmdW5jdGlvbiB0byB0ZW1wbGF0ZVxuXHRcdFx0XHRcdFx0cmV0dXJuIGtlbmRvLnRlbXBsYXRlKGBcblx0XHRcdFx0XHRcdFx0IzogYnl0ZXNUb1NpemUoc2l6ZSwgMiwgJ0tCJykgI1xuXHRcdFx0XHRcdFx0YCkoZGF0YUl0ZW0pO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0d2lkdGg6IDEyMCxcblx0XHRcdFx0XHRtaW5TY3JlZW5XaWR0aDogNTc2XG5cdFx0XHRcdH0sXG4gICAgICAgICAgICAgICAge1xuXHRcdFx0XHRcdGZpZWxkOiAnbGFzdE1vZCcsXG5cdFx0XHRcdFx0dGl0bGU6ICdMYXN0IE1vZGlmaWVkJyxcblx0XHRcdFx0XHR0ZW1wbGF0ZToga2VuZG8udGVtcGxhdGUoYFxuXHRcdFx0XHRcdFx0Izoga2VuZG8udG9TdHJpbmcobmV3IERhdGUobGFzdE1vZCksICdkZCBNTU0geXl5eSBISDptbTpzcycpICNcblx0XHRcdFx0XHRgKSxcblx0XHRcdFx0XHR3aWR0aDogMjAwLFxuXHRcdFx0XHRcdG1pblNjcmVlbldpZHRoOiA3Njhcblx0XHRcdFx0fSxcbiAgICAgICAgICAgIF0sXG5cdFx0XHRjaGFuZ2U6ICQucHJveHkodGhpcy5fb25GaWxlU2VsZWN0ZWRDaGFuZ2UsIHRoaXMpXG4gICAgICAgIH0pLmRhdGEoJ2tlbmRvVHJlZUxpc3QnKTtcblxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdFx0Ly8gQWRkIGxpc3RlbmVycyB0byBjYXRjaCBjb250cm9sIGJ1dHRvbiBjbGlja3Mgb24gcm93c1xuXHRcdCQoJyNleG0tZmlsZUxpc3QnKS5vbignY2xpY2snLCAnLmNyZWF0ZS1mb2xkZXItYnQnLCAkLnByb3h5KHRoaXMuX3Nob3dBZGRGb2xkZXJNb2RhbENsaWNrLCB0aGlzKSk7XG5cdFx0JCgnI2V4bS1maWxlTGlzdCcpLm9uKCdjbGljaycsICcudXBsb2FkLWZpbGVzLWJ0JywgJC5wcm94eSh0aGlzLl9zaG93VXBsb2FkRmlsZXNNb2RhbENsaWNrLCB0aGlzKSk7XG5cdFx0JCgnI2V4bS1maWxlTGlzdCcpLm9uKCdjbGljaycsICcucmVtb3ZlLWZpbGUtYnQnLCAkLnByb3h5KHRoaXMuX29uUmVtb3ZlRmlsZUNsaWNrLCB0aGlzKSk7XG5cdFx0JCgnI2V4bS1maWxlTGlzdCcpLm9uKCdjbGljaycsICcucmVsb2FkLWV4dC1idCcsICQucHJveHkodGhpcy5fb25SZWxvYWRFeHRDbGljaywgdGhpcykpO1xuXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0XHQvLyBJbml0aWFsaXplIFwiYWRkIGZvbGRlclwiIG1vZGFsXG5cdFx0dGhpcy5fYWRkRm9sZGVyTW9kYWwgPSAkKCcjZXhtLWFkZEZvbGRlck1vZGFsJyk7XG5cdFx0dGhpcy5fYWRkRm9sZGVyTW9kYWwubW9kYWwoe1xuXHRcdFx0YmFja2Ryb3A6ICdzdGF0aWMnLFxuXHRcdFx0a2V5Ym9hcmQ6IGZhbHNlLFxuXHRcdFx0c2hvdzogZmFsc2Vcblx0XHR9KTtcblxuXHRcdC8vIEFkZCBsaXN0ZW5lciB0byBtb2RhbCBoaWRlIGV2ZW50XG5cdFx0dGhpcy5fYWRkRm9sZGVyTW9kYWwub24oJ2hpZGRlbi5icy5tb2RhbCcsICQucHJveHkodGhpcy5fb25BZGRGb2xkZXJNb2RhbEhpZGRlbiwgdGhpcykpO1xuXG5cdFx0Ly8gQWRkIGxpc3RlbmVyIHRvIEFkZCBidXR0b24gY2xpY2tcblx0XHQkKCcjZXhtLWFkZEZvbGRlckJ0Jykub24oJ2NsaWNrJywgJC5wcm94eSh0aGlzLl9vbkFkZEZvbGRlckNsaWNrLCB0aGlzKSk7XG5cblx0XHQvLyBJbml0aWFsaXplIGtlbmRvIHZhbGlkYXRpb24gb24gZm9sZGVyIG5hbWUgZm9ybVxuXHRcdHRoaXMuX2FkZEZvbGRlclZhbGlkYXRvciA9ICQoJyNleG0tYWRkRm9sZGVyRm9ybScpLmtlbmRvVmFsaWRhdG9yKHt9KS5kYXRhKCdrZW5kb1ZhbGlkYXRvcicpO1xuXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0XHQvLyBJbml0aWFsaXplIFwidXBsb2FkIGZpbGVzXCIgbW9kYWxcblx0XHR0aGlzLl91cGxvYWRGaWxlc01vZGFsID0gJCgnI2V4bS11cGxvYWRNb2RhbCcpO1xuXHRcdHRoaXMuX3VwbG9hZEZpbGVzTW9kYWwubW9kYWwoe1xuXHRcdFx0YmFja2Ryb3A6ICdzdGF0aWMnLFxuXHRcdFx0a2V5Ym9hcmQ6IGZhbHNlLFxuXHRcdFx0c2hvdzogZmFsc2Vcblx0XHR9KTtcblxuXHRcdC8vIEluaXRpYWxpemUga2VuZG8gdXBsb2FkZXJcblx0XHR0aGlzLl91cGxvYWRlciA9ICQoJyNleG0tdXBsb2FkZXInKS5rZW5kb1VwbG9hZCh7XG5cdFx0XHRtdWx0aXBsZTogdHJ1ZSxcblx0XHRcdGFzeW5jOiB7XG5cdFx0XHRcdHNhdmVVcmw6ICdodHRwOi8vbG9jYWxob3N0JywgLy8gVGhpcyB3aWxsIGJlIGNoYW5nZWQgbGF0ZXIgaW4gX29uVXBsb2FkU3RhcnQgbWV0aG9kXG5cdFx0XHRcdGF1dG9VcGxvYWQ6IHRydWUsXG5cdFx0XHR9LFxuXHRcdFx0ZGlyZWN0b3J5RHJvcDogdHJ1ZSxcblx0XHRcdHVwbG9hZDogJC5wcm94eSh0aGlzLl9vblVwbG9hZFN0YXJ0LCB0aGlzKSxcblx0XHRcdGNvbXBsZXRlOiAkLnByb3h5KHRoaXMuX29uVXBsb2FkRW5kLCB0aGlzKSxcblx0XHRcdGxvY2FsaXphdGlvbjoge1xuXHRcdFx0XHRzZWxlY3Q6ICdTZWxlY3QgZmlsZXMuLi4nXG5cdFx0XHR9XG5cdFx0fSkuZGF0YSgna2VuZG9VcGxvYWQnKTtcblxuXHRcdC8vIEFkZCBsaXN0ZW5lciB0byBVcGxvYWQgYnV0dG9uIGNsaWNrXG5cdFx0JCgnI2V4bS1jbGVhckZpbGVzQnQnKS5vbignY2xpY2snLCAkLnByb3h5KHRoaXMuX29uQ2xlYXJGaWxlc0NsaWNrLCB0aGlzKSk7XG5cblx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRcdC8vIFNlbmQgaW5pdGlhbGl6YXRpb24gcmVxdWVzdFxuXHRcdHRoaXMuc2VuZEV4dGVuc2lvblJlcXVlc3QodGhpcy5SRVFfSU5JVCk7XG5cdH1cblxuXHRkZXN0cm95KClcblx0e1xuXHRcdC8vIENhbGwgc3VwZXIgbWV0aG9kXG5cdFx0c3VwZXIuZGVzdHJveSgpO1xuXG5cdFx0JCgnI2V4bS1yZXRyeUJ0Jykub2ZmKCdjbGljaycpO1xuXHRcdCQoJyNleG0tcmVmcmVzaEJ0Jykub2ZmKCdjbGljaycpO1xuXG5cdFx0JCgnI2V4bS1maWxlTGlzdCcpLm9mZignY2xpY2snKTtcblxuXHRcdHRoaXMuX2FkZEZvbGRlck1vZGFsLm9mZignaGlkZGVuLmJzLm1vZGFsJyk7XG5cdFx0dGhpcy5fYWRkRm9sZGVyTW9kYWwubW9kYWwoJ2Rpc3Bvc2UnKTtcblx0XHQkKCcjZXhtLWFkZEZvbGRlckJ0Jykub2ZmKCdjbGljaycpO1xuXG5cdFx0dGhpcy5fdXBsb2FkRmlsZXNNb2RhbC5tb2RhbCgnZGlzcG9zZScpO1xuXHRcdCQoJyNleG0tY2xlYXJGaWxlc0J0Jykub2ZmKCdjbGljaycpO1xuXHR9XG5cblx0b25FeHRlbnNpb25Db21tYW5kKGNvbW1hbmQsIGRhdGEpXG5cdHtcblx0XHQvLyBNb2R1bGUgY2FuIGJlIGVuYWJsZWQgKG5vIGxvY2tpbmcgZmlsZSBleGlzdHMpXG5cdFx0aWYgKGNvbW1hbmQgPT0gdGhpcy5SRVNQX0lOSVQpXG5cdFx0e1xuXHRcdFx0Ly8gUmV0cmlldmUgZmlsZSBzZXBhcmF0b3Jcblx0XHRcdHRoaXMuX2ZpbGVTZXBhcmF0b3IgPSBkYXRhLmdldFV0ZlN0cmluZygnc2VwJyk7XG5cblx0XHRcdC8vIFJldHJpZXZlIEV4dGVuc2lvbnMnIF9fbGliX18gZm9sZGVyIG5hbWVcblx0XHRcdGNvbnN0IGxpYkZvbGRlciA9IGRhdGEuZ2V0VXRmU3RyaW5nKCdsaWInKTtcblxuXHRcdFx0Ly8gQ3JlYXRlIGZpbGUgZGF0YSBzb3VyY2UgbWFuYWdlclxuXHRcdFx0dGhpcy5fZmlsZU1hbmFnZXIgPSBuZXcgRmlsZURhdGFTb3VyY2VNYW5hZ2VyKGxpYkZvbGRlciwgW2xpYkZvbGRlcl0sIHRoaXMuX2ZpbGVTZXBhcmF0b3IpO1xuXG5cdFx0XHQvLyBSZXRyaWV2ZSBIVFRQIHBvcnQgdG8gYmUgdXNlZCBmb3IgZmlsZXMgdXBsb2FkaW5nXG5cdFx0XHRjb25zdCB1cGxvYWRIdHRwUG9ydCA9IGRhdGEuZ2V0SW50KCdodHRwUG9ydCcpO1xuXG5cdFx0XHQvLyBSZXRyaWV2ZSBtb2R1bGUgaWQgc2VudCBieSB0aGUgc2VydmVyIChyZXF1aXJlZCBiZWNhdXNlIG11bHRpcGxlIG1vZHVsZXMgdXNlIGZpbGUgdXBsb2FkaW5nIHNlcnZpY2UpXG5cdFx0XHRjb25zdCB1cGxvYWRNb2R1bGVJZCA9IGRhdGEuZ2V0VXRmU3RyaW5nKCdtb2RJZCcpO1xuXG5cdFx0XHQvLyBTZXQgZmlsZSB1cGxvYWRpbmcgdGFyZ2V0IGNvbmZpZ3VyYXRpb25cblx0XHRcdHRoaXMuX3VwbG9hZFRhcmdldENvbmZpZyA9IHtcblx0XHRcdFx0c2Vzc2lvblRva2VuOiB0aGlzLnNtYXJ0Rm94LnNlc3Npb25Ub2tlbixcblx0XHRcdFx0aG9zdDogdGhpcy5zbWFydEZveC5jb25maWcuaG9zdCxcblx0XHRcdFx0aHR0cFBvcnQ6IHVwbG9hZEh0dHBQb3J0LFxuXHRcdFx0XHRtb2R1bGVJZDogdXBsb2FkTW9kdWxlSWQsXG5cdFx0XHR9O1xuXG5cdFx0XHQvLyBSZXF1ZXN0IEV4dGVuc2lvbiBmaWxlcyBkYXRhIHRvIHNlcnZlciBpbnN0YW5jZVxuXHRcdFx0dGhpcy5fcmVmcmVzaERhdGFMaXN0KCk7XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQgKiBUaGlzIHJlc3BvbnNlIGlzIHJldHVybmVkIGlmIHRoZSBmaWxlIFVwbG9hZHNMb2NrLnR4dCBleGlzdHMgaW4gdGhlIC9jb25maWcgZm9sZGVyIG9mIHRoZSBzZXJ2ZXIuXG5cdFx0ICogVGhpcyBpcyBhbiBhZGRpdGlvbmFsIHNlY3VyaXR5IG1lYXN1cmUgdG8gYXZvaWQgdW53YW50ZWQgZmlsZXMgdG8gYmUgdXBsb2FkZWQgYnkgbWFsaWNpdXMgdXNlcnMgYWNjZXNzaW5nIHRoZSBzZXJ2ZXJcblx0XHQgKiB3aXRoIHRoZSBkZWZhdWx0IGNyZWRlbnRpYWxzLCBpbiBjYXNlIHRoZXkgaGF2ZSBub3QgYmVlbiBjaGFuZ2VkIGJ5IHRoZSBhZG1pbmlzdHJhdG9yIGFmdGVyIHRoZSBpbnN0YWxsYXRpb24uXG5cdFx0ICogVGhlIGZpbGUgbXVzdCBiZSByZW1vdmVkIG1hbnVhbGx5IGJlZm9yZSBhY2Nlc3NpbmcgdGhlIEV4dGVuc2lvbiBNYW5hZ2VyIG1vZHVsZSBmb3IgdGhlIGZpcnN0IHRpbWVcblx0XHQgKi9cblx0XHRlbHNlIGlmIChjb21tYW5kID09IHRoaXMuUkVTUF9MT0NLRUQpXG5cdFx0e1xuXHRcdFx0Ly8gU2hvdyB3YXJuaW5nXG5cdFx0XHR0aGlzLl9zd2l0Y2hWaWV3KCdleG0tbG9ja2VkJyk7XG5cdFx0fVxuXG5cdFx0Ly8gRXh0ZW5zaW9ucyBmb2xkZXJzIGFuZCBmaWxlc1xuXHRcdGVsc2UgaWYgKGNvbW1hbmQgPT0gdGhpcy5SRVNQX0VYVEVOU0lPTlMpXG5cdFx0e1xuXHRcdFx0Ly8gUmV0cmlldmUgRXh0ZW5zaW9uIGZpbGUgbGlzdFxuXHRcdFx0bGV0IGV4dGVuc2lvbnNPYmogPSBkYXRhLmdldFNGU09iamVjdCgnZXh0ZW5zaW9ucycpO1xuXG5cdFx0XHQvLyBJbml0aWFsaXplIG1hbmFnZXJcblx0XHRcdHRoaXMuX2ZpbGVNYW5hZ2VyLmluaXQoKTtcblxuXHRcdFx0Ly8gQWRkIGxpc3QgdG8gbWFuYWdlclxuXHRcdFx0dGhpcy5fZmlsZU1hbmFnZXIuYWRkRmlsZShleHRlbnNpb25zT2JqKTtcblxuXHRcdFx0Ly8gU2V0IFRyZWVMaXN0IGRhdGEgc291cmNlXG5cdFx0XHR0aGlzLl9maWxlc0xpc3Quc2V0RGF0YVNvdXJjZSh0aGlzLl9maWxlTWFuYWdlci5kYXRhU291cmNlKTtcblxuXHRcdFx0Ly8gRXhwYW5kIGZpcnN0IGxldmVsXG5cdFx0XHR0aGlzLl9maWxlc0xpc3QuZXhwYW5kKCQoJyNleG0tZmlsZUxpc3QgdGJvZHk+dHI6ZXEoMCknKSk7XG5cblx0XHRcdC8vIEVuYWJsZSBpbnRlcmZhY2Vcblx0XHRcdHRoaXMuX2VuYWJsZUludGVyZmFjZSh0cnVlKTtcblxuXHRcdFx0Ly8gU2hvdyBtb2R1bGUncyBtYWluIHZpZXdcblx0XHRcdHRoaXMuX3N3aXRjaFZpZXcoJ2V4bS1tYWluJyk7XG5cdFx0fVxuXG5cdFx0Ly8gQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgbWFuYWdpbmcgZXh0ZW5zaW9uIGZpbGVzXG5cdFx0ZWxzZSBpZiAoY29tbWFuZCA9PSB0aGlzLlJFU1BfRVJST1IpXG5cdFx0e1xuXHRcdFx0Ly8gSGlkZSBhZGQgZm9sZGVyIG1vZGFsXG5cdFx0XHR0aGlzLl9hZGRGb2xkZXJNb2RhbC5tb2RhbCgnaGlkZScpO1xuXG5cdFx0XHQvLyBSZS1lbmFibGUgaW50ZXJmYWNlXG5cdFx0XHR0aGlzLl9lbmFibGVJbnRlcmZhY2UodHJ1ZSk7XG5cblx0XHRcdC8vIFNob3cgYW4gYWxlcnRcblx0XHRcdHRoaXMuc2hlbGxDdHJsLnNob3dTaW1wbGVBbGVydChkYXRhLmdldFV0ZlN0cmluZygnZXJyb3InKSk7XG5cdFx0fVxuXG5cdFx0Ly8gRXh0ZW5zaW9uIGZvbGRlciBvciBmaWxlIGFkZGVkXG5cdFx0ZWxzZSBpZiAoY29tbWFuZCA9PSB0aGlzLlJFU1BfRklMRV9BRERFRClcblx0XHR7XG5cdFx0XHQvLyBHZXQgbmFtZSBvZiB0aGUgdXNlciB3aG8gYWRkZWQgdGhlIGZpbGUvZm9sZGVyXG5cdFx0XHRjb25zdCByZXF1ZXN0ZXIgPSBkYXRhLmdldFV0ZlN0cmluZygndXNlcicpO1xuXG5cdFx0XHQvLyBHZXQgdGhlIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGZpbGUvZm9sZGVyIGJlaW5nIGFkZGVkXG5cdFx0XHRjb25zdCBmaWxlT2JqID0gZGF0YS5nZXRTRlNPYmplY3QoJ2ZpbGUnKTtcblxuXHRcdFx0Ly8gR2V0IHRoZSB0YXJnZXQgZm9sZGVyIHdoZXJlIHRoZSBuZXcgZmlsZS9mb2xkZXIgc2hvdWxkIGJlIGFkZGVkXG5cdFx0XHRjb25zdCBwYXJlbnRQYXRoID0gZGF0YS5nZXRVdGZTdHJpbmcoJ3BhcmVudCcpO1xuXG5cdFx0XHQvLyBHZXQgdGhlIGZsYWcgbm90aWZ5aW5nIHRoaXMgd2FzIGEgZmlsZSB1cGxvYWRcblx0XHRcdGNvbnN0IGlzVXBsb2FkID0gZGF0YS5nZXRCb29sKCdpc1VwbG9hZCcpO1xuXG5cdFx0XHR0cnlcblx0XHRcdHtcblx0XHRcdFx0Ly8gQWRkL3VwZGF0ZSBpdGVtIG9uIGRhdGEgc291cmNlXG5cdFx0XHRcdGNvbnN0IGZpbGVQYXRoID0gdGhpcy5fZmlsZU1hbmFnZXIuYWRkRmlsZVRvUGFyZW50KGZpbGVPYmosIHBhcmVudFBhdGgpO1xuXG5cdFx0XHRcdC8vIFJlZnJlc2ggdmlld1xuXHRcdFx0XHR0aGlzLl9maWxlc0xpc3QucmVmcmVzaCgpO1xuXG5cdFx0XHRcdGlmIChyZXF1ZXN0ZXIgPT0gdGhpcy5zbWFydEZveC5teVNlbGYubmFtZSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdC8vIEV4cGFuZCBwYXJlbnRcblx0XHRcdFx0XHR0aGlzLl9maWxlc0xpc3QuZXhwYW5kKCQoYCNleG0tZmlsZUxpc3QgLmZpbGUtY29udHJvbHNbZGF0YS1pdGVtLWlkPVwiJHtwYXJlbnRQYXRofVwiXWApLmNsb3Nlc3QoJ3RyJykpO1xuXG5cdFx0XHRcdFx0aWYgKCFpc1VwbG9hZClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHQvLyBIaWRlIG1vZGFsXG5cdFx0XHRcdFx0XHR0aGlzLl9hZGRGb2xkZXJNb2RhbC5tb2RhbCgnaGlkZScpO1xuXG5cdFx0XHRcdFx0XHQvLyBTZWxlY3QgdXBsb2FkIGZpbGVcblx0XHRcdFx0XHRcdHRoaXMuX2ZpbGVzTGlzdC5zZWxlY3QoJChgI2V4bS1maWxlTGlzdCAuZmlsZS1jb250cm9sc1tkYXRhLWl0ZW0taWQ9XCIke2ZpbGVQYXRofVwiXWApLmNsb3Nlc3QoJ3RyJykpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFVwZGF0ZSBzZWxlY3Rpb25cblx0XHRcdFx0XHR0aGlzLl9vbkZpbGVTZWxlY3RlZENoYW5nZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdC8vIERpc3BsYXkgbm90aWZpY2F0aW9uXG5cdFx0XHRcdFx0aWYgKCFpc1VwbG9hZClcblx0XHRcdFx0XHRcdHRoaXMuc2hlbGxDdHJsLnNob3dOb3RpZmljYXRpb24oYEZvbGRlciBjcmVhdGVkYCwgYEFkbWluaXN0cmF0b3IgJHtyZXF1ZXN0ZXJ9IGNyZWF0ZWQgZm9sZGVyOiA8c3Ryb25nPiR7ZmlsZVBhdGh9PC9zdHJvbmc+YCk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0dGhpcy5zaGVsbEN0cmwuc2hvd05vdGlmaWNhdGlvbihgRmlsZSB1cGxvYWRlZGAsIGBBZG1pbmlzdHJhdG9yICR7cmVxdWVzdGVyfSB1cGxvYWRlZCBmaWxlOiA8c3Ryb25nPiR7ZmlsZVBhdGh9PC9zdHJvbmc+YCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBUaGlzIHNob3VsZCBub3QgaGFwcGVuLi4uIGRhdGEgc291cmNlIGlzIGNvcnJ1cHRlZD9cblx0XHRcdFx0aWYgKHJlcXVlc3RlciA9PSB0aGlzLnNtYXJ0Rm94Lm15U2VsZi5uYW1lKVxuXHRcdFx0XHRcdHRoaXMuc2hlbGxDdHJsLnNob3dTaW1wbGVBbGVydChlLm1lc3NhZ2UsIHRydWUpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBFbmFibGUgaW50ZXJmYWNlXG5cdFx0XHR0aGlzLl9lbmFibGVJbnRlcmZhY2UodHJ1ZSk7XG5cdFx0fVxuXG5cdFx0Ly8gRXh0ZW5zaW9uIGZpbGVzIGRlbGV0ZWRcblx0XHRlbHNlIGlmIChjb21tYW5kID09IHRoaXMuUkVTUF9GSUxFU19ERUxFVEVEKVxuXHRcdHtcblx0XHRcdC8vIEdldCBuYW1lIG9mIHRoZSB1c2VyIHdobyBkZWxldGVkIHRoZSBmaWxlL3Ncblx0XHRcdGNvbnN0IHJlcXVlc3RlciA9IGRhdGEuZ2V0VXRmU3RyaW5nKCd1c2VyJyk7XG5cblx0XHRcdC8vIEdldCB0aGUgbGlzdCBvZiBkZWxldGVkIGZpbGVzXG5cdFx0XHRsZXQgZmlsZXMgPSBkYXRhLmdldFNGU0FycmF5KCdmaWxlcycpO1xuXG5cdFx0XHRsZXQgZmlsZXNBcnIgPSBbXTtcblxuXHRcdFx0Ly8gVXBkYXRlIGRhdGEgc291cmNlXG5cdFx0XHRmb3IgKGxldCBqID0gMDsgaiA8IGZpbGVzLnNpemUoKTsgaisrKVxuXHRcdFx0e1xuXHRcdFx0XHRsZXQgcGF0aCA9IGZpbGVzLmdldFV0ZlN0cmluZyhqKTtcblx0XHRcdFx0ZmlsZXNBcnIucHVzaChwYXRoKTtcblxuXHRcdFx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdFx0XHRcdC8vIFJlbW92ZSBpdGVtIGZyb20gZGF0YSBzb3VyY2U7IHBhcmVudCBpdGVtIGlzIHJldHVybmVkXG5cdFx0XHRcdGxldCBwYXJlbnRJdGVtID0gdGhpcy5fZmlsZU1hbmFnZXIucmVtb3ZlRmlsZShwYXRoKTtcblxuXHRcdFx0XHQvLyBDb2xsYXBzZSBwYXJlbnQgaWYgdGhlIGxhc3Qgb2YgaXRzIGNoaWxkcmVuIHdhcyBkZWxldGVkXG5cdFx0XHRcdGlmIChwYXJlbnRJdGVtICYmICFwYXJlbnRJdGVtLmhhc0NoaWxkcmVuKVxuXHRcdFx0XHRcdHRoaXMuX2ZpbGVzTGlzdC5jb2xsYXBzZSgkKGAjZXhtLWZpbGVMaXN0IC5maWxlLWNvbnRyb2xzW2RhdGEtaXRlbS1pZD1cIiR7cGFyZW50SXRlbS5pZH1cIl1gKS5jbG9zZXN0KCd0cicpKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHJlcXVlc3RlciA9PSB0aGlzLnNtYXJ0Rm94Lm15U2VsZi5uYW1lKVxuXHRcdFx0e1xuXHRcdFx0XHQvLyBEaXNwbGF5IG5vdGlmaWNhdGlvblxuXHRcdFx0XHR0aGlzLnNoZWxsQ3RybC5zaG93Tm90aWZpY2F0aW9uKGAke3RoaXMuX3NlbGVjdGVkSXRlbS5pc0RpciA/ICdGb2xkZXInIDogJ0ZpbGUnfSBkZWxldGVkYCwgYCR7dGhpcy5fc2VsZWN0ZWRJdGVtLmlzRGlyID8gJ0ZvbGRlcicgOiAnRmlsZSd9ICcke3RoaXMuX3NlbGVjdGVkSXRlbS5uYW1lfScgZGVsZXRlZCBzdWNjZXNzZnVsbHlgKTtcblxuXHRcdFx0XHR0aGlzLl9zZWxlY3RlZEl0ZW0gPSBudWxsO1xuXG5cdFx0XHRcdHRoaXMuX2VuYWJsZUludGVyZmFjZSh0cnVlKTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Ly8gRGlzcGxheSBub3RpZmljYXRpb25cblx0XHRcdFx0dGhpcy5zaGVsbEN0cmwuc2hvd05vdGlmaWNhdGlvbihgRmlsZSBkZWxldGVkYCwgYEFkbWluaXN0cmF0b3IgJHtyZXF1ZXN0ZXJ9IGRlbGV0ZWQgdGhlIGZvbGxvd2luZyBmaWxlJHtmaWxlc0Fyci5sZW5ndGggPiAxID8gJ3MnIDogJyd9OiA8c3Ryb25nPiR7ZmlsZXNBcnIuam9pbignPGJyPiAnKX08L3N0cm9uZz5gKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVzZXQgc2VsZWN0aW9uXG5cdFx0XHR0aGlzLl9vbkZpbGVTZWxlY3RlZENoYW5nZSgpO1xuXHRcdH1cblxuXHRcdC8vIGVsc2UgaWYgKClcblx0fVxuXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdC8vIFVJIEVWRU5UIExJU1RFTkVSU1xuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdF9vblJldHJ5Q2xpY2soKVxuXHR7XG5cdFx0dGhpcy5fc3dpdGNoVmlldygnZXhtLWluaXQnKTtcblxuXHRcdC8vIFJlLXNlbmQgaW5pdGlhbGl6YXRpb24gcmVxdWVzdFxuXHRcdHRoaXMuc2VuZEV4dGVuc2lvblJlcXVlc3QodGhpcy5SRVFfSU5JVCk7XG5cdH1cblxuXHRfb25SZWZyZXNoQ2xpY2soKVxuXHR7XG5cdFx0dGhpcy5fZmlsZXNMaXN0LmNsZWFyU2VsZWN0aW9uKCk7XG5cdFx0dGhpcy5fcmVmcmVzaERhdGFMaXN0KCk7XG5cdH1cblxuXHRfb25GaWxlU2VsZWN0ZWRDaGFuZ2UoKVxuXHR7XG5cdFx0Ly8gSGlkZSBjb250cm9sIGJ1dHRvbnMgb24gY3VycmVudGx5IHNlbGVjdGVkIGl0ZW1cblx0XHRpZiAodGhpcy5fc2VsZWN0ZWRJdGVtKVxuXHRcdFx0JChgI2V4bS1maWxlTGlzdCAuZmlsZS1jb250cm9sc1tkYXRhLWl0ZW0taWQ9XCIke3RoaXMuX3NlbGVjdGVkSXRlbS5pZH1cIl1gKS5oaWRlKCk7XG5cblx0XHQvLyBHZXQgc2VsZWN0ZWQgaXRlbVxuXHRcdGxldCBzZWxlY3RlZFJvd3MgPSB0aGlzLl9maWxlc0xpc3Quc2VsZWN0KCk7XG5cblx0XHRpZiAoc2VsZWN0ZWRSb3dzLmxlbmd0aCA+IDApXG5cdFx0e1xuXHRcdFx0Ly8gU2F2ZSByZWYuIHRvIHNlbGVjdGVkIGl0ZW1cblx0XHRcdHRoaXMuX3NlbGVjdGVkSXRlbSA9IHRoaXMuX2ZpbGVzTGlzdC5kYXRhSXRlbShzZWxlY3RlZFJvd3NbMF0pO1xuXG5cdFx0XHQvLyBTaG93IGNvbnRyb2wgYnV0dG9ucyBvbiBuZXcgc2VsZWN0ZWQgaXRlbVxuXHRcdFx0JChgI2V4bS1maWxlTGlzdCAuZmlsZS1jb250cm9sc1tkYXRhLWl0ZW0taWQ9XCIke3RoaXMuX3NlbGVjdGVkSXRlbS5pZH1cIl1gKS5zaG93KCk7XG5cdFx0fVxuXHRcdGVsc2Vcblx0XHRcdHRoaXMuX3NlbGVjdGVkSXRlbSA9IG51bGw7XG5cdH1cblxuXHRfc2hvd0FkZEZvbGRlck1vZGFsQ2xpY2soKVxuXHR7XG5cdFx0aWYgKHRoaXMuX3NlbGVjdGVkSXRlbSAmJiB0aGlzLl9zZWxlY3RlZEl0ZW0uaXNEaXIpXG5cdFx0e1xuXHRcdFx0dGhpcy5fYWRkRm9sZGVyTW9kYWwubW9kYWwoJ3Nob3cnKTtcblx0XHRcdCQoJyNleG0tZm9sZGVyTmFtZUluJykuZm9jdXMoKTtcblx0XHR9XG5cdH1cblxuXHRfb25BZGRGb2xkZXJDbGljaygpXG5cdHtcblx0XHQvLyBUaGUgcGFyZW50IGZvbGRlciBjb3VsZCBoYXZlIGJlZW4gZGVsZXRlZCB3aGlsZSB1c2VyIGlzIHN0aWxsIHR5cGluZyB0aGUgbmFtZSBvZiB0aGUgbmV3IGNoaWxkIGZvbGRlclxuXHRcdGlmICghdGhpcy5fc2VsZWN0ZWRJdGVtKVxuXHRcdHtcblx0XHRcdHRoaXMuX2FkZEZvbGRlck1vZGFsLm1vZGFsKCdoaWRlJyk7XG5cdFx0XHR0aGlzLnNoZWxsQ3RybC5zaG93U2ltcGxlQWxlcnQoJ1VuYWJsZSB0byBjcmVhdGUgZm9sZGVyOyB0aGUgcGFyZW50IGZvbGRlciBkb2VzblxcJ3QgZXhpc3QuJyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2FkZEZvbGRlclZhbGlkYXRvci52YWxpZGF0ZSgpKVxuXHRcdHtcblx0XHRcdC8vIERpc2FibGUgbW9kYWwgaW50ZXJmYWNlXG5cdFx0XHR0aGlzLl9lbmFibGVBZGRGb2xkZXJNb2RhbChmYWxzZSk7XG5cblx0XHRcdGxldCBkYXRhID0gbmV3IFNGUzJYLlNGU09iamVjdCgpO1xuXHRcdFx0ZGF0YS5wdXRVdGZTdHJpbmcoJ2ZvbGRlcicsIHRoaXMuX3NlbGVjdGVkSXRlbS5pZCArIHRoaXMuX2ZpbGVTZXBhcmF0b3IgKyAkKCcjZXhtLWZvbGRlck5hbWVJbicpLnZhbCgpKTtcblxuXHRcdFx0Ly8gU2VuZCByZXF1ZXN0IHRvIHNlcnZlclxuXHRcdFx0dGhpcy5zZW5kRXh0ZW5zaW9uUmVxdWVzdCh0aGlzLlJFUV9DUkVBVEVfRk9MREVSLCBkYXRhKTtcblx0XHR9XG5cdH1cblxuXHRfb25BZGRGb2xkZXJNb2RhbEhpZGRlbigpXG5cdHtcblx0XHQkKCcjZXhtLWZvbGRlck5hbWVJbicpLnZhbCgnJyk7XG5cdFx0dGhpcy5fcmVzZXRBZGRGb2xkZXJWYWxpZGF0aW9uKCk7XG5cblx0XHQvLyBFbmFibGUgbW9kYWwgaW50ZXJmYWNlXG5cdFx0dGhpcy5fZW5hYmxlQWRkRm9sZGVyTW9kYWwodHJ1ZSk7XG5cdH1cblxuXHRfc2hvd1VwbG9hZEZpbGVzTW9kYWxDbGljaygpXG5cdHtcblx0XHRpZiAodGhpcy5fc2VsZWN0ZWRJdGVtKVxuXHRcdFx0dGhpcy5fdXBsb2FkRmlsZXNNb2RhbC5tb2RhbCgnc2hvdycpO1xuXHR9XG5cblx0X29uQ2xlYXJGaWxlc0NsaWNrKClcblx0e1xuXHRcdHRoaXMuX3VwbG9hZGVyLmNsZWFyQWxsRmlsZXMoKTtcblx0fVxuXG5cdF9vblVwbG9hZFN0YXJ0KGUpXG5cdHtcblx0XHQvLyBEaXNhYmxlIGNsZWFyIGJ1dHRvblxuXHRcdCQoJyNleG0tY2xlYXJGaWxlc0J0JykuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcblxuXHRcdC8vIFNldCBkZXN0aW5hdGlvbiB1cmxcblx0XHRjb25zdCB1cmwgPSAnaHR0cDovLycgKyB0aGlzLl91cGxvYWRUYXJnZXRDb25maWcuaG9zdCArICc6JyArIHRoaXMuX3VwbG9hZFRhcmdldENvbmZpZy5odHRwUG9ydCArICcvQmx1ZUJveC9TRlMyWEZpbGVVcGxvYWQ/c2Vzc0hhc2hJZD0nICsgdGhpcy5fdXBsb2FkVGFyZ2V0Q29uZmlnLnNlc3Npb25Ub2tlbjtcblxuXHRcdGUuc2VuZGVyLm9wdGlvbnMuYXN5bmMuc2F2ZVVybCA9IHVybDtcblxuXHRcdC8vIFNldCBwYXlsb2FkXG5cdFx0Y29uc3QgcGFyYW1zID0gbmV3IEZvcm1EYXRhKCk7XG5cdFx0cGFyYW1zLmFwcGVuZCgnX19tb2R1bGUnLCB0aGlzLl91cGxvYWRUYXJnZXRDb25maWcubW9kdWxlSWQpO1xuXHRcdHBhcmFtcy5hcHBlbmQoJ19fdGFyZ2V0JywgdGhpcy5fc2VsZWN0ZWRJdGVtLmlkKTtcblxuXHRcdGZvciAobGV0IGYgPSAwOyBmIDwgZS5maWxlcy5sZW5ndGg7IGYrKylcblx0XHRcdHBhcmFtcy5hcHBlbmQoJ2ZpbGVzW10nLCBlLmZpbGVzW2ZdLnJhd0ZpbGUpO1xuXG5cdFx0ZS5mb3JtRGF0YSA9IHBhcmFtcztcblx0fVxuXG5cdF9vblVwbG9hZEVuZChlKVxuXHR7XG5cdFx0Ly8gRW5hYmxlIGNsZWFyIGJ1dHRvblxuXHRcdCQoJyNleG0tY2xlYXJGaWxlc0J0JykuYXR0cignZGlzYWJsZWQnLCBmYWxzZSk7XG5cdH1cblxuXHRfb25GaWxlc1VwbG9hZEVuZChyZXNwb25zZSlcblx0e1xuXHRcdC8vIE5vdGhpbmcgdG8gZG86IHdlIGhhdmUgdG8gd2FpdCB0aGUgdXBsb2FkIHByb2Nlc3MgY29tcGxldGlvbiB0byBiZSBzaWduYWxlZCBieSB0aGUgc2VydmVyIHRocm91Z2ggdGhlIGRlZGljYXRlZCBFeHRlbnNpb24gcmVzcG9uc2VcblxuXHRcdC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXHRcdC8vIFRPRE8gU2hvdWxkIHdlIGhhbmRsZSB0aGlzIHJlc3BvbnNlIGluIHNvbWUgd2F5PyBGb3Igc29tZSB1bmtub3duIHJlYXNvbiB3ZSBhbHdheXMgZ2V0IG9rPWZhbHNlIGFuZCBzdGF0dXM9MFxuXHRcdC8vIGNvbnNvbGUubG9nKHJlc3BvbnNlKVxuXHRcdC8vIGNvbnNvbGUubG9nKHJlc3BvbnNlLm9rKVxuXHRcdC8vIGNvbnNvbGUubG9nKHJlc3BvbnNlLnN0YXR1cylcblx0fVxuXG5cdF9vblJlbW92ZUZpbGVDbGljaygpXG5cdHtcblx0XHRpZiAodGhpcy5fc2VsZWN0ZWRJdGVtKVxuXHRcdFx0dGhpcy5zaGVsbEN0cmwuc2hvd0NvbmZpcm1XYXJuaW5nKGBBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoZSBzZWxlY3RlZCAke3RoaXMuX3NlbGVjdGVkSXRlbS5pc0RpciA/ICdmb2xkZXInIDogJ2ZpbGUnfT88YnI+PGJyPlBhdGg6IDxzdHJvbmc+JHt0aGlzLl9zZWxlY3RlZEl0ZW0uaWR9PC9zdHJvbmc+YCwgJC5wcm94eSh0aGlzLl9vblJlbW92ZUZpbGVDb25maXJtLCB0aGlzKSk7XG5cdH1cblxuXHRfb25SZW1vdmVGaWxlQ29uZmlybSgpXG5cdHtcblx0XHQvLyBEaXNhYmxlIGludGVyZmFjZVxuXHRcdHRoaXMuX2VuYWJsZUludGVyZmFjZShmYWxzZSk7XG5cblx0XHQvLyBSZXF1ZXN0IEV4dGVuc2lvbiBmaWxlcyByZW1vdmFsXG5cdFx0Ly8gTk9URTogZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBvbGRlciBBZG1pblRvb2wsIHRoZSBmaWxlIHRvIGJlIGRlbGV0ZWQgaXMgc2VudFxuXHRcdC8vIGluIGFuIGFycmF5IG9mIHN0cmluZ3MsIGV2ZW4gaWYgd2UgY2FuJ3QgZGVsZXRlIG1vcmUgdGhhbiAxIGZpbGUgYXQgb25jZSBpbiB0aGlzIEFkbWluVG9vbFxuXG5cdFx0bGV0IGZpbGVzID0gbmV3IFNGUzJYLlNGU0FycmF5KCk7XG5cdFx0ZmlsZXMuYWRkVXRmU3RyaW5nKHRoaXMuX3NlbGVjdGVkSXRlbS5pZCk7XG5cblx0XHRsZXQgcGFyYW1zID0gbmV3IFNGUzJYLlNGU09iamVjdCgpO1xuXHRcdHBhcmFtcy5wdXRTRlNBcnJheSgnZmlsZXMnLCBmaWxlcyk7XG5cblx0XHR0aGlzLnNlbmRFeHRlbnNpb25SZXF1ZXN0KHRoaXMuUkVRX0RFTEVURV9GSUxFUywgcGFyYW1zKTtcblx0fVxuXG5cdF9vblJlbG9hZEV4dENsaWNrKClcblx0e1xuXHRcdGlmICh0aGlzLl9zZWxlY3RlZEl0ZW0pXG5cdFx0e1xuXHRcdFx0bGV0IHBhdGhBcnIgPSB0aGlzLl9zZWxlY3RlZEl0ZW0uaWQuc3BsaXQodGhpcy5fZmlsZVNlcGFyYXRvcik7XG5cblx0XHRcdGlmIChwYXRoQXJyLmxlbmd0aCA+IDEpXG5cdFx0XHR7XG5cdFx0XHRcdC8vIFJlcXVlc3QgRXh0ZW5zaW9uIHJlbG9hZFxuXHRcdFx0XHQvLyBOT1RFOiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG9sZGVyIEFkbWluVG9vbCwgdGhlIEV4dGVuc2lvbiB0byBiZSByZWxvYWRlZCBpcyBzZW50XG5cdFx0XHRcdC8vIGluIGFuIGFycmF5IG9mIHN0cmluZ3MsIGV2ZW4gaWYgd2UgY2FuJ3QgcmVsb2FkIG1vcmUgdGhhbiAxIEV4dGVuc2lvbiBhdCBvbmNlIGluIHRoaXMgQWRtaW5Ub29sXG5cblx0XHRcdFx0bGV0IGV4dFRvUmVsb2FkID0gW107XG5cdFx0XHRcdGV4dFRvUmVsb2FkLnB1c2gocGF0aEFyclsxXSk7XG5cblx0XHRcdFx0bGV0IHBhcmFtcyA9IG5ldyBTRlMyWC5TRlNPYmplY3QoKTtcblx0XHRcdFx0cGFyYW1zLnB1dFV0ZlN0cmluZ0FycmF5KCdleHRlbnNpb25zJywgZXh0VG9SZWxvYWQpO1xuXG5cdFx0XHRcdC8vIFNlbmQgcmVxdWVzdCB0byBzZXJ2ZXJcblx0XHRcdFx0dGhpcy5zZW5kRXh0ZW5zaW9uUmVxdWVzdCh0aGlzLlJFUV9SRUxPQURfRVhURU5TSU9OUywgcGFyYW1zKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHQvLyBQUklWQVRFIE1FVEhPRFNcblx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRfc3dpdGNoVmlldyh2aWV3SWQpXG5cdHtcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXhtLXZpZXdzdGFjaycpLnNlbGVjdGVkRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHZpZXdJZCk7XG5cdH1cblxuXHRfZW5hYmxlSW50ZXJmYWNlKGVuYWJsZSlcblx0e1xuXHRcdCQoJyNleG0tZmlsZUxpc3QnKS5hdHRyKCdkaXNhYmxlZCcsICFlbmFibGUpO1xuXHRcdCQoJyNleG0tcmVmcmVzaEJ0JykuYXR0cignZGlzYWJsZWQnLCAhZW5hYmxlKTtcblx0fVxuXG5cdF9yZWZyZXNoRGF0YUxpc3QoKVxuXHR7XG5cdFx0Ly8gRGlzYWJsZSBpbnRlcmZhY2Vcblx0XHR0aGlzLl9lbmFibGVJbnRlcmZhY2UoZmFsc2UpO1xuXG5cdFx0Ly8gU2VuZCByZXF1ZXN0IHRvIHNlcnZlclxuXHRcdHRoaXMuc2VuZEV4dGVuc2lvblJlcXVlc3QodGhpcy5SRVFfR0VUX0VYVEVOU0lPTlMpXG5cdH1cblxuXHRfcmVzZXRBZGRGb2xkZXJWYWxpZGF0aW9uKClcblx0e1xuXHRcdHRoaXMuX2FkZEZvbGRlclZhbGlkYXRvci5oaWRlTWVzc2FnZXMoKTtcblxuXHRcdC8vIFRoZSBtZXRob2QgYWJvdmUgZG9lc24ndCByZW1vdmUgdGhlIGstaW52YWxpZCBjbGFzc2VzIGFuZCBhcmlhLWludmFsaWQ9XCJ0cnVlXCIgYXR0cmlidXRlcyBmcm9tIGlucHV0c1xuXHRcdC8vIExldCdzIGRvIGl0IG1hbnVhbGx5XG5cdFx0JCgnI2V4bS1hZGRGb2xkZXJGb3JtIC5rLWludmFsaWQnKS5yZW1vdmVDbGFzcygnay1pbnZhbGlkJyk7XG5cdFx0JCgnI2V4bS1hZGRGb2xkZXJGb3JtIFthcmlhLWludmFsaWQ9XCJ0cnVlXCJdJykucmVtb3ZlQXR0cignYXJpYS1pbnZhbGlkJyk7XG5cdH1cblxuXHRfZW5hYmxlQWRkRm9sZGVyTW9kYWwoZW5hYmxlKVxuXHR7XG5cdFx0Ly8gRGlzYWJsZSBtb2RhbCBjbG9zZSBidXR0b25zXG5cdFx0JCgnI2V4bS1hZGRGb2xkZXJNb2RhbCBidXR0b25bZGF0YS1kaXNtaXNzPVwibW9kYWxcIl0nKS5hdHRyKCdkaXNhYmxlZCcsICFlbmFibGUpO1xuXG5cdFx0Ly8gRGlzYWJsZSBhZGQgYnV0dG9uXG5cdFx0JCgnI2V4bS1hZGRGb2xkZXJCdCcpLmF0dHIoJ2Rpc2FibGVkJywgIWVuYWJsZSk7XG5cblx0XHQvLyBEaXNhYmxlIGZpZWxkc2V0XG5cdFx0JCgnI2V4bS1hZGRGb2xkZXJGb3JtJykuYXR0cignZGlzYWJsZWQnLCAhZW5hYmxlKTtcblx0fVxuXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdC8vIFBSSVZBVEUgR0VUVEVSU1xuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbn1cbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7QUNoSkE7QUFBQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7O0FDdkdBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7O0EiLCJzb3VyY2VSb290IjoiIn0=