/*
 * This file is part of the Companion project
 * Copyright (c) 2018 Bitfocus AS
 * Authors: William Viker <william@bitfocus.io>, Håkon Nessjøen <haakon@bitfocus.io>
 *
 * This program is free software.
 * You should have received a copy of the MIT licence as well as the Bitfocus
 * Individual Contributor License Agreement for companion along with
 * this program.
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving the Companion software without
 * disclosing the source code of your own applications.
 *
 */

var instance = {};
var instance_status = {};
var instance_variables = {};
var instance_variabledata = {};

$(function() {
	var iconfig = {};
	var current_instance;

	var debug = console.log;
	$("#instanceConfigTab").hide();

	socket.emit('instance_get');
	console.log('instance_get');
	socket.emit('instance_status_get');

	function updateInstanceStatus() {
		for (var x in instance_status) {
			var s = instance_status[x];

			// disabled
			if (s[0] === -1) {
				$("#instance_status_"+x).html('Disabled').attr('title', '').removeClass('instance-status-ok').removeClass('instance-status-warn').removeClass('instance-status-error').addClass('instance-status-disabled');
			}

			// ok
			if (s[0] === 0) {
				$("#instance_status_"+x).html('OK').attr('title', '').removeClass('instance-status-error').removeClass('instance-status-warn').removeClass('instance-status-disabled').addClass('instance-status-ok')
			}

			// warning
			else if (s[0] === 1) {
				$("#instance_status_"+x).html(""+s[1]).attr('title', s[1]).removeClass('instance-status-ok').removeClass('instance-status-error').removeClass('instance-status-disabled').addClass('instance-status-warn')
			}

			// error
			else if (s[0] === 2) {
				$("#instance_status_"+x).html("ERROR").attr('title', s[1]).removeClass('instance-status-ok').removeClass('instance-status-warn').removeClass('instance-status-disabled').addClass('instance-status-error')
			}

		}
	}

	socket.on('instance_status', function(obj) {
		instance_status = obj;
		updateInstanceStatus();
	});

	function updateInstanceList(list, dontclear) {
		var $il = $("#instanceList");
		if (!dontclear) $il.html("");

		for (var n in list) {
			var i = list[n];

			var $tr = $("<tr></tr>");

			var $td_id = $("<td></td>");
			var $td_label = $("<td id='label_"+n+"'>label</td>");
			var $td_status = $("<td id='instance_status_"+n+"'>no status</td>");
			var $td_actions = $("<td></td>");
			console.log("list", list);
			var $button_edit = $("<button type='button' data-id='"+n+"' class='instance-edit btn btn-primary'>edit</button>");
			var $button_delete = $("<button type='button' data-id='"+n+"' class='instance-delete btn btn-sm btn-ghost-danger'>delete</button>");
			var $button_disable = $("<button type='button' data-id='"+n+"' class='instance-disable btn btn-sm btn-ghost-warning'>disable</button>");
			var $button_enable = $("<button type='button' data-id='"+n+"' class='instance-enable btn btn-sm btn-ghost-success'>enable</button>");

			$td_actions.append($button_delete)
			$td_actions.append($("<span>&nbsp;</span>"));

			if (i.enabled === undefined || i.enabled === true) {
				$td_actions.append($button_disable)
			}
			else {
				$td_actions.append($button_enable);
			}

			$td_actions.append($("<span>&nbsp;</span>"));
			$td_actions.append($button_edit);

			$button_delete.click(function() {
				if (confirm('Delete instance?')) {
					var id = $(this).data('id');
					$("#instanceConfigTab").hide();
					console.log("instance-delete:",id);
					socket.emit('instance_delete', id);
					$(this).parent().parent().remove();
				}
			});

			$button_edit.click(function() {
				var id = $(this).data('id');
				console.log("instance-edit:",id);
				socket.emit('instance_edit', id);
			});

			$button_disable.click(function() {
				var id = $(this).data('id');
				console.log("instance-disable:",id);
				socket.emit('instance_enable', id, false);
			});

			$button_enable.click(function() {
				var id = $(this).data('id');
				console.log("instance-enable:",id);
				socket.emit('instance_enable', id, true);
			});

			for (var x in instance.module) {
				if (instance.module[x].id == list[n].instance_type) {
					$td_id.text(instance.module[x].label);
				}
			}


			if (list[n].label !== undefined) {
				$td_label.text(list[n].label);
			}

			$tr.append($td_id);
			$tr.append($td_label);
			$tr.append($td_status);
			$tr.append($td_actions);

			$il.append($tr);

		}
		updateInstanceStatus();
	};

	socket.on('instance', function(i) {
		instance = i;

		updateInstanceList(i.db);
		console.log('instance', i);

		$addInstance = $("#addInstance");
		$addInstance.html("<option value='null'> + Add instance</option>");

		if (instance.module !== undefined) {
			// Sort the list first
			var list = instance.module.sort(function (a,b) {
				if (a.label.toUpperCase() < b.label.toUpperCase()) {
					return -1;
				}

				if (a.label.toUpperCase() > b.label.toUpperCase()) {
					return 1;
				}

				return 0;
			});

			$addInstance.change(function() {
				if ($(this).val() !== "null") {
					socket.emit('instance_add', $(this).val() );
					console.log('instance_add()');
					$(this).val("null");
					socket.once('instance_add:result', function(id,db) {
						instance.db = db;
						console.log("instance_add:result()", id,db);
						socket.emit('instance_edit', id);
					});
				}
			});


			for (var n in list) {
				var im = list[n];
				var $instance = $('<option value="'+im.id+'" data-id="'+im.id+'">'+ im.label +'</option>');
				$addInstance.append($instance)
			}
		}
	});

	socket.on('instance_db_update', function(db) {
		instance.db = db;
	});

	function saveConfig(button, id) {
		var $icf = $("#instanceConfigFields");
		var $button = $(button);
		var ok = true;
		var data = {};

		$icf.find('.instanceConfigField').each(function () {
			var $this = $(this);

			if (!ok) {
				return;
			}

			if ($this.data('valid') === false) {
				console.log("Invalid data in ", this);
				ok = false;
				return;
			}

			if ($this.data('type') == 'textinput') {
				data[$this.data('id')] = $this.val();
			}

			else if ($this.data('type') == 'dropdown') {
				data[$this.data('id')] = $this.val();
			}
			else {
				console.log("saveConfig: Unknown field type: ", $this.data('type'), this);
			}
		});

		if (ok) {
			socket.emit('instance_config_put', id, data);
			socket.once('instance_config_put:result', function (err, res) {
				if (res) {
					$button.css('backgroundColor', 'lightgreen');
					setTimeout(function () {
						$button.css('backgroundColor', '');
					}, 300);
				} else {

					if (err == 'duplicate label') {
						var $field = $icf.find('input[data-id="label"]');
						$field.css('backgroundColor', 'red');
						setTimeout(function () {
							$field.css('backgroundColor', '');
						}, 500);

						alert('The label "' + data.label + '" is already in use. Please use a unique name for this module instance');
					}
				}
			});

		} else {
			$button.css('backgroundColor', 'red');
			setTimeout(function () {
				$button.css('backgroundColor', '');
			}, 500);
		}

	}

	function showInstanceVariables() {
		var $icv = $('#instanceConfigVariables');
		var $icvl = $('#instanceConfigVariableList');

		if (instance_variables[current_instance] !== undefined && instance_variables[current_instance].length > 0) {
			$icv.show();
			$icvl.html('');

			console.log()

			for (var i in instance_variables[current_instance]) {
				var variable = instance_variables[current_instance][i];
				$icvl.append('<tr data-id="' + current_instance + ':' + variable.name + '"><td>$(' + current_instance + ':' + variable.name + ')</td><td>' + variable.label + '</td><td>' + instance_variabledata[current_instance + ':' + variable.name] + '</td></tr>');
			}
		}
	}

	socket.emit('variable_instance_definitions_get');
	socket.on('variable_instance_definitions_get:result', function (err, data) {
		if (data) {
			instance_variables = data;
		}
	});
	socket.on('variable_instance_definitions_set', function (label, variables) {
		instance_variables[label] = variables;

		if (label == current_instance) {
			showInstanceVariables();
		}
	});

	socket.emit('variables_get');
	socket.on('variables_get:result', function (err, data) {
		if (data) {
			instance_variabledata = data;
		}
		showInstanceVariables();
	});

	socket.on('variable_set', function (key, value) {
		var match = current_instance + ':';

		instance_variabledata[key] = value;

		$('#instanceConfigVariableList tr[data-id="' + key + '"] > td:nth-child(3)').text(value);
	});

	socket.on('instance_edit:result', function(id, store, res, config ) {
		$('#instanceConfigTab').show();
		$('#instanceConfigVariables').hide();
		$('#instanceConfigTab a[href="#instanceConfig"]').tab('show');

		for (var n in store.module) {
			if (store.module[n].id === store.db[id].instance_type) {
				$('#instanceConfig h4:first').text( store.module[n].label + ' configuration');
			}
		}


		iconfig = config;

		current_instance = config.label;
		showInstanceVariables();

		var $icf = $("#instanceConfigFields");
		$icf.html("");

		for (var n in res) {
			var field = res[n];
			var regex = undefined;

			if (field.regex){
				var flags = field.regex.replace(/.*\/([gimy]*)$/, '$1');
				var pattern = field.regex.replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
				regex = new RegExp(pattern, flags);
			}

			var $sm = $('<div class="fieldtype-'+field.type+' col-sm-'+field.width+'"><label>'+field.label+'</label></div>');

			if (field.type == 'text') {
				var $inp = $("<p></p>");
				$inp.html(field.value);
				if (field.tooltip !== undefined) {
					$inp.attr('title', field.tooltip);
				}
				$sm.append($inp);
			}


			else if (field.type == 'textinput') {
				var $inp = $("<input type='text' class='form-control instanceConfigField' data-type='"+field.type+"' data-id='"+field.id+"'>");

				if (field.tooltip !== undefined) {
					$inp.attr('title', field.tooltip);
				}

				$inp.val(field.default);

				(function(f1,f2,inp,reg) {
					inp.keyup(function(){
						if (f2 == 'label') {
							$("#label_"+ f1).text(inp.val());
						}

						if (regex === undefined || inp.val().match(reg) !== null) {
							this.style.color = "black";

							$(this).data('valid', true);
						} else {
							this.style.color = "red";
							$(this).data('valid', false);
						}

					});
				})(id,field.id,$inp,regex);

				$sm.append($inp);
			}
			else if (field.type == 'dropdown') {
				var $inp = $("<select class='form-control instanceConfigField' data-type='"+field.type+"' data-id='"+field.id+"'>");

				if (field.tooltip !== undefined) {
					$inp.attr('title', field.tooltip);
				}

				$inp.data('valid', true);

				for (var i = 0; i < field.choices.length; ++i) {
					$inp.append('<option value="' + field.choices[i].id + '">' + field.choices[i].label + '</option>');
				}

				$inp.val(field.default);

				$sm.append($inp);
			}
			else {
				console.log("FIELD:" ,field);
			}
			$icf.append($sm);
		}

		$(".instanceConfigField").each(function() {

			var key = $(this).data('id');

			if (config[key] !== undefined) {
				$(this).val(config[key]);
			}

		});

		var $button = $('<button class="btn btn-primary" type="button" id="config_save">Apply changes</button>');
		var $bcontainer = $('<div class="col-lg-12 col-sm-12 col-xs-12"></div>');
		var $brow = $('<div class="row padtop"></div>')

		$bcontainer.append($button);
		$brow.append($bcontainer);

		$('#config_save').remove();
		$('#instanceConfig').append($brow);

		$button.click(function () {
			saveConfig(this, id);
		});

		updateInstanceList(store.db);
	});

	socket.on('instance_get:result', function(instance_list) {
		console.log('instance_get:result:', instance_list);

		for (var n in instance_list.db) {
			var instance = instance_list.db[n];
			console.log("Xinstance", instance);
		}


	});

	socket.on('config_fields:result', function(id, fields, config) {
		socket.emit('instance_get');
		console.log("config_fields:result", id, fields, config);
	});

	$(".addInstance").click(function() {
		socket.emit('instance_add', $(this).data('id'));
		$("#elgbuttons").click();
	});

});
