package org.igye.memoryrefresh.ui

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Parcelable
import androidx.activity.viewModels
import org.igye.memoryrefresh.config.MemoryRefreshApp

class SharedFileReceiverActivity : WebViewActivity<SharedFileReceiverViewModel>() {
    override val viewModel: SharedFileReceiverViewModel by viewModels {
        (application as MemoryRefreshApp).appContainer.viewModelFactory
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val sentFileURI: Uri = (intent.getParcelableExtra<Parcelable>(Intent.EXTRA_STREAM) as? Uri)!!
        viewModel.sharedFileUri = sentFileURI.toString()
        viewModel.onClose = { finish() }
    }
}

